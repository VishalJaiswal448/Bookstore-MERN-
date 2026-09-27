import { useEffect, useState } from 'react';
import { ArrowLeft, Heart, ShoppingCart, Star, Truck, ShieldCheck } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';

export default function BookDetails() {
  const { id } = useParams();
  const { add } = useCart();
  const { user } = useAuth();
  const { has, toggle } = useWishlist();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data } = await api.get(`/books/${id}`);
        if (active) setBook(data);
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Book not found.');
      }
    };
    load();
    return () => { active = false; };
  }, [id]);

  if (error) {
  return (
    <main className="section page-top">
      <div className="container">
        <div className="error">
          {error}
        </div>

        <Link
          className="back"
          to="/books"
        >
          <ArrowLeft size={16} />
          Back to books
        </Link>
      </div>
    </main>
  );
}

if (!book) {
  return (
    <main className="section page-top">
      <div className="container">
        <div className="loading-card">
          Loading book details…
        </div>
      </div>
    </main>
  );
}

const saved = has(book._id);

const discount =
  book.mrp > book.price
    ? Math.round(
        (1 - book.price / book.mrp) * 100
      )
    : 0;

const wishlistAction = async () => {
  if (!user) {
    return navigate("/login", {
      state: {
        from: `/books/${book._id}`,
      },
    });
  }

  try {
    await toggle(book);
  } catch {
    setError(
      "Could not update your wishlist. Please try again."
    );
  }
};

return (
  <main className="section page-top">
    <div className="container">
      <Link
        className="back"
        to="/books"
      >
        <ArrowLeft size={16} />
        Back to books
      </Link>

      <div className="detail-grid">
        <div className="detail-cover">
          <img
            src={book.cover}
            alt={book.title}
          />
        </div>

        <div className="detail-copy">
          <div className="detail-topline">
            <span className="book-cat">
              {book.category}
            </span>

            {user?.role === "customer" && (
              <button
                className={`wishlist-detail ${
                  saved ? "saved" : ""
                }`}
                onClick={wishlistAction}
              >
                <Heart
                  size={17}
                  fill={
                    saved
                      ? "currentColor"
                      : "none"
                  }
                />

                {saved ? "Saved" : "Wishlist"}
              </button>
            )}
          </div>

          <h1>{book.title}</h1>

          <p className="detail-author">
            by <b>{book.author}</b> · sold by{" "}
            <b>{book.seller?.name || "Seller"}</b>
          </p>

          <div className="big-rating">
            <span>
              <Star
                size={17}
                fill="currentColor"
              />

              {" "}
              {book.rating?.toFixed?.(1) ||
                book.rating}
            </span>

            {" "}
            {book.sold || 0} readers have bought this
          </div>

          <p className="description">
            {book.description ||
              "A thoughtfully selected title available from the BookBazaar seller network."}
          </p>

          <div className="price-row">
            <strong>
              ₹{book.price}
            </strong>

            {book.mrp > book.price && (
              <>
                <del>
                  ₹{book.mrp}
                </del>

                <span className="save">
                  Save {discount}%
                </span>
              </>
            )}
          </div>

          <div className="stock">
            {book.stock > 0
              ? `${book.stock} copies available`
              : "Out of stock"}
          </div>

          <div className="detail-actions">
            <button
              className="btn btn-dark"
              disabled={!book.stock}
              onClick={() => add(book)}
            >
              <ShoppingCart size={17} />
              Add to cart
            </button>

            {user?.role === "customer" && (
              <button
                className="btn btn-outline"
                onClick={wishlistAction}
              >
                <Heart
                  size={17}
                  fill={
                    saved
                      ? "currentColor"
                      : "none"
                  }
                />

                {saved ? "Remove" : "Save"}
              </button>
            )}
          </div>

          <div className="trust-row">
            <span>
              <Truck />
              Delivery across India
            </span>

            <span>
              <ShieldCheck />
              Secure payment
            </span>
          </div>
        </div>
      </div>
    </div>
  </main>
);
}