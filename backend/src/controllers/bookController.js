import mongoose from 'mongoose';
import Book from '../models/Book.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Wishlist from '../models/Wishlist.js';

function cleanString(value, max = 500) { return String(value ?? '').trim().slice(0, max); }

function bookPayload(body = {}) {
  const price = Number(body.price);
  const mrp = Number(body.mrp);
  const stock = Number(body.stock);
  const rating = Number(body.rating ?? 0);

  if (
    !cleanString(body.title, 160) ||
    !cleanString(body.author, 120) ||
    !cleanString(body.category, 80)
  ) {
    throw new Error(
      "Title, author and category are required."
    );
  }

  if (
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isFinite(mrp) ||
    mrp < price ||
    !Number.isFinite(stock) ||
    stock < 0 ||
    !Number.isInteger(stock) ||
    !Number.isFinite(rating) ||
    rating < 0 ||
    rating > 5
  ) {
    throw new Error(
      "Please enter valid price, MRP, stock and rating values."
    );
  }

  const cover =
    cleanString(body.cover, 1000) ||
    "https://placehold.co/480x640?text=Book";

  if (!/^https?:\/\//i.test(cover)) {
    throw new Error(
      "Cover URL must start with http:// or https://."
    );
  }

  return {
    title: cleanString(body.title, 160),
    author: cleanString(body.author, 120),
    description: cleanString(
      body.description,
      4000
    ),
    category: cleanString(
      body.category,
      80
    ),

    price: Math.round(price),
    mrp: Math.round(mrp),
    stock,
    rating: Math.round(rating * 10) / 10,
    cover,
  };
}

async function assertCategory(name) {
  const category = await Category.findOne({
    name,
    isActive: true,
  }).lean();

  if (!category) {
    throw new Error(
      "Please select an active category."
    );
  }
}

async function resolveSeller(req, body) {
  if (req.user.role === "seller") {
    return req.user._id;
  }

  if (
    !mongoose.isValidObjectId(body?.sellerId)
  ) {
    throw new Error(
      "Admin must choose a seller for this product."
    );
  }

  const seller = await User.findOne({
    _id: body.sellerId,
    role: "seller",
    isActive: true,
  }).lean();

  if (!seller) {
    throw new Error(
      "Selected seller is invalid or inactive."
    );
  }

  return seller._id;
}

export async function listBooks(req, res) {
  const search = cleanString(
    req.query.search,
    100
  );

  const category = cleanString(
    req.query.category,
    80
  );

  const seller = cleanString(
    req.query.seller,
    60
  );

  const minPrice = req.query.minPrice === ''
    ? null
    : Number(req.query.minPrice);

  const maxPrice = req.query.maxPrice === ''
    ? null
    : Number(req.query.maxPrice);

  const query = {};

  if (search) {
    query.$or = [
      {
        title: {
          $regex: search,
          $options: "i",
        },
      },
      {
        author: {
          $regex: search,
          $options: "i",
        },
      },
      {
        category: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  if (category) {
    query.category = category;
  }

  if (
    seller &&
    mongoose.isValidObjectId(seller)
  ) {
    query.seller = seller;
  }

  if (
    Number.isFinite(minPrice) ||
    Number.isFinite(maxPrice)
  ) {
    query.price = {};

    if (
      Number.isFinite(minPrice) &&
      minPrice >= 0
    ) {
      query.price.$gte = minPrice;
    }

    if (
      Number.isFinite(maxPrice) &&
      maxPrice >= 0
    ) {
      query.price.$lte = maxPrice;
    }

    if (!Object.keys(query.price).length) {
      delete query.price;
    }
  }

  const sortMap = {
    "price-asc": {
      price: 1,
    },
    "price-desc": {
      price: -1,
    },
    rating: {
      rating: -1,
      sold: -1,
    },
    newest: {
      createdAt: -1,
    },
  };

  const sort =
    sortMap[req.query.sort] ||
    sortMap.newest;

  const books = await Book.find(query)
    .populate("seller", "name")
    .sort(sort)
    .limit(300)
    .lean();

  res.json(books);
}

export async function myBooks(req, res) {
  const query =
    req.user.role === "admin"
      ? {}
      : {
          seller: req.user._id,
        };

  const books = await Book.find(query)
    .populate("seller", "name")
    .sort({ createdAt: -1 })
    .limit(300)
    .lean();

  res.json(books);
}

export async function getBook(req, res) {
  if (
    !mongoose.isValidObjectId(req.params.id)
  ) {
    return res
      .status(404)
      .json({ message: "Book not found" });
  }

  const book = await Book.findById(
    req.params.id
  )
    .populate("seller", "name")
    .lean();

  if (!book) {
    return res
      .status(404)
      .json({ message: "Book not found" });
  }

  res.json(book);
}

export async function createBook(req, res) {
  try {
    const data = bookPayload(req.body);

    await assertCategory(data.category);

    const seller = await resolveSeller(
      req,
      req.body
    );

    const book = await Book.create({
      ...data,
      seller,
    });

    res.status(201).json(
      await Book.findById(book._id)
        .populate("seller", "name")
        .lean()
    );
  } catch (err) {
    res.status(400).json({
      message:
        err.message ||
        "Could not create book",
    });
  }
}

export async function updateBook(req, res) {
  if (
    !mongoose.isValidObjectId(req.params.id)
  ) {
    return res
      .status(404)
      .json({ message: "Book not found" });
  }

  const book = await Book.findById(
    req.params.id
  );

  if (!book) {
    return res
      .status(404)
      .json({ message: "Book not found" });
  }

  if (
    req.user.role !== "admin" &&
    String(book.seller) !==
      String(req.user._id)
  ) {
    return res.status(403).json({
      message:
        "You can only manage your own books.",
    });
  }

  try {
    const data = bookPayload(req.body);

    await assertCategory(data.category);

    Object.assign(book, data);

    if (req.user.role === "admin") {
      book.seller = await resolveSeller(
        req,
        req.body
      );
    }

    await book.save();

    res.json(
      await Book.findById(book._id)
        .populate("seller", "name")
        .lean()
    );
  } catch (err) {
    res.status(400).json({
      message:
        err.message ||
        "Could not update book",
    });
  }
}

export async function deleteBook(req, res) {
  if (
    !mongoose.isValidObjectId(req.params.id)
  ) {
    return res
      .status(404)
      .json({ message: "Book not found" });
  }

  const book = await Book.findById(
    req.params.id
  );

  if (!book) {
    return res
      .status(404)
      .json({ message: "Book not found" });
  }

  if (
    req.user.role !== "admin" &&
    String(book.seller) !==
      String(req.user._id)
  ) {
    return res.status(403).json({
      message:
        "You can only manage your own books.",
    });
  }

  await book.deleteOne();

  await Wishlist.updateMany(
    {},
    {
      $pull: {
        books: book._id,
      },
    }
  );

  res.json({
    message: "Book deleted",
  });
}

export async function categories(req, res) {
  const values = await Category.find({
    isActive: true,
  })
    .sort({ name: 1 })
    .select("name")
    .lean();

  if (values.length) {
    return res.json(
      values.map((item) => item.name)
    );
  }

  const fallback =
    await Book.distinct("category");

  res.json(
    fallback
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
  );
}

export async function recommendations(
  req,
  res
) {
  const q = cleanString(
    req.query.q,
    100
  );

  if (!q) {
    return res.json([]);
  }

  const escaped = q
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8)
    .map((w) =>
      w.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      )
    );

  const regexes = escaped.map(
    (w) => new RegExp(w, "i")
  );

  const books = await Book.find({
    $or: regexes.flatMap((r) => [
      { title: r },
      { author: r },
      { category: r },
    ]),
  })
    .limit(8)
    .lean();

  res.json(books);
}