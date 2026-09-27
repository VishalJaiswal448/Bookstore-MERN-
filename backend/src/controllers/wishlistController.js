import mongoose from 'mongoose';
import Wishlist from '../models/Wishlist.js';
import Book from '../models/Book.js';

export async function getWishlist(req, res) {
  const wishlist = await Wishlist.findOne({ user: req.user._id }).populate({ path: 'books', populate: { path: 'seller', select: 'name' } }).lean();
  res.json(wishlist?.books?.filter(Boolean) || []);
}

export async function addToWishlist(req, res) {
  if (
    !mongoose.isValidObjectId(
      req.params.bookId
    )
  ) {
    return res.status(404).json({
      message: "Book not found.",
    });
  }

  const book = await Book.findById(
    req.params.bookId
  ).lean();

  if (!book) {
    return res.status(404).json({
      message: "Book not found.",
    });
  }

  await Wishlist.updateOne(
    {
      user: req.user._id,
    },
    {
      $addToSet: {
        books: book._id,
      },
    },
    {
      upsert: true,
    }
  );

  res.json({
    ok: true,
    bookId: book._id,
  });
}

export async function removeFromWishlist(
  req,
  res
) {
  if (
    !mongoose.isValidObjectId(
      req.params.bookId
    )
  ) {
    return res.status(404).json({
      message: "Book not found.",
    });
  }

  await Wishlist.updateOne(
    {
      user: req.user._id,
    },
    {
      $pull: {
        books: req.params.bookId,
      },
    }
  );

  res.json({
    ok: true,
  });
}