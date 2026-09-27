import mongoose from 'mongoose';
import User from '../models/User.js';
import Book from '../models/Book.js';
import Category from '../models/Category.js';
import Order from '../models/Order.js';

const clean = (value, max = 120) => String(value ?? '').trim().slice(0, max);

export async function dashboard(req, res) {
  const [
    customers,
    sellers,
    admins,
    books,
    categories,
    orders,
    revenueAgg,
    lowStock,
    recentOrders,
  ] = await Promise.all([
    User.countDocuments({ role: "customer" }),

    User.countDocuments({ role: "seller" }),

    User.countDocuments({ role: "admin" }),

    Book.countDocuments(),

    Category.countDocuments({ isActive: true }),

    Order.countDocuments(),

    Order.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          status: { $ne: "Cancelled" },
        },
      },
      {
        $group: {
          _id: null,
          value: { $sum: "$total" },
        },
      },
    ]),

    Book.find({ stock: { $lte: 5 } })
      .sort({ stock: 1, title: 1 })
      .limit(8)
      .populate("seller", "name")
      .lean(),

    Order.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .populate("customer", "name email")
      .lean(),
  ]);

  res.json({
    stats: {
      customers,
      sellers,
      admins,
      users: customers + sellers + admins,
      books,
      categories,
      orders,
      revenue: revenueAgg[0]?.value || 0,
    },
    lowStock,
    recentOrders,
  });
}

export async function listUsers(req, res) {
  const search = clean(req.query.search, 100);
  const role = clean(req.query.role, 20);
  const status = clean(req.query.status, 20);
  const query = {};

  if (search) {
    query.$or = [
      {
        name: {
          $regex: search,
          $options: "i",
        },
      },
      {
        email: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  if (["customer", "seller", "admin"].includes(role)) {
    query.role = role;
  }

  if (status === "active") {
    query.isActive = true;
  }

  if (status === "inactive") {
    query.isActive = false;
  }

  res.json(
    await User.find(query)
      .select(
        "name email role isActive createdAt lastLogin"
      )
      .sort({ createdAt: -1 })
      .limit(300)
      .lean()
  );
}

export async function updateUser(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res
      .status(404)
      .json({ message: "User not found." });
  }

  if (String(req.params.id) === String(req.user._id)) {
    return res.status(400).json({
      message:
        "You cannot change your own admin role or deactivate your own account.",
    });
  }

  const user = await User.findById(req.params.id).select(
    "+password"
  );

  if (!user) {
    return res
      .status(404)
      .json({ message: "User not found." });
  }

  const nextRole = req.body?.role;
  const hasRole = nextRole !== undefined;
  const hasActive = req.body?.isActive !== undefined;

  if (
    hasRole &&
    !["customer", "seller", "admin"].includes(nextRole)
  ) {
    return res
      .status(400)
      .json({ message: "Invalid user role." });
  }

  if (
    hasActive &&
    typeof req.body.isActive !== "boolean"
  ) {
    return res
      .status(400)
      .json({ message: "Invalid active status." });
  }

  if (
    hasRole &&
    user.role === "seller" &&
    nextRole !== "seller" &&
    (await Book.exists({ seller: user._id }))
  ) {
    return res.status(400).json({
      message:
        "This seller owns products. Reassign or remove those products before changing the role.",
    });
  }

  const willLoseAdmin =
    user.role === "admin" &&
    ((hasRole && nextRole !== "admin") ||
      (hasActive && req.body.isActive === false));

  if (
    willLoseAdmin &&
    (await User.countDocuments({
      role: "admin",
      isActive: true,
      _id: { $ne: user._id },
    })) < 1
  ) {
    return res.status(400).json({
      message:
        "At least one active administrator must remain.",
    });
  }

  if (hasRole) {
    user.role = nextRole;
  }

  if (hasActive) {
    user.isActive = req.body.isActive;
  }

  await user.save();

  res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    },
  });
}

export async function listAllCategories(req, res) {
  res.json(
    await Category.find()
      .populate("createdBy", "name")
      .sort({ name: 1 })
      .lean()
  );
}

function slugify(value) {
  return clean(value, 80)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function createCategory(req, res) {
  const name = clean(req.body?.name, 80);
  const description = clean(req.body?.description, 300);
  const slug = slugify(name);

  if (!name || !slug) {
    return res.status(400).json({
      message: "Category name is required.",
    });
  }

  if (await Category.findOne({ slug })) {
    return res.status(409).json({
      message:
        "A category with that name already exists.",
    });
  }

  res.status(201).json(
    await Category.create({
      name,
      slug,
      description,
      createdBy: req.user._id,
    })
  );
}

export async function updateCategory(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({
      message: "Category not found.",
    });
  }

  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json({
      message: "Category not found.",
    });
  }

  const nextName = clean(req.body?.name, 80);
  const nextDescription = clean(
    req.body?.description,
    300
  );
  const hasActive =
    req.body?.isActive !== undefined;

  if (
    hasActive &&
    typeof req.body.isActive !== "boolean"
  ) {
    return res.status(400).json({
      message: "Invalid active status.",
    });
  }

  if (nextName) {
    const nextSlug = slugify(nextName);

    const duplicate = await Category.findOne({
      slug: nextSlug,
      _id: { $ne: category._id },
    });

    if (duplicate) {
      return res.status(409).json({
        message:
          "A category with that name already exists.",
      });
    }

    const previousName = category.name;

    category.name = nextName;
    category.slug = nextSlug;

    if (previousName !== nextName) {
      await Book.updateMany(
        { category: previousName },
        { $set: { category: nextName } }
      );
    }
  }

  category.description = nextDescription;

  if (hasActive) {
    category.isActive = req.body.isActive;
  }

  await category.save();

  res.json(category);
}

export async function deleteCategory(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({
      message: "Category not found.",
    });
  }

  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json({
      message: "Category not found.",
    });
  }

  if (await Book.exists({ category: category.name })) {
    category.isActive = false;

    await category.save();

    return res.json({
      message:
        "Category is used by books, so it has been archived instead of permanently deleted.",
      category,
    });
  }

  await category.deleteOne();

  res.json({
    message: "Category deleted.",
  });
}