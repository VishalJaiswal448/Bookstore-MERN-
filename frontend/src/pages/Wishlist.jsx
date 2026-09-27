import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

export default function Wishlist() {
  const { items, loading, remove } = useWishlist();
  const { add } = useCart();

  return (
      <main className="section page-top">
        <div className="container">
        <div className="page-title">
          <div>
              <span className="kicker">Saved for later</span>
              <h1>Wishlist</h1>
              <p>Keep the books you want to come back to.</p>
          </div>
        </div>

    {loading ? (
      <div className="loading-card">
        Loading your wishlist...
      </div>
    ) : items.length === 0 ? (
      <div className="empty large">
        <Heart size={42} />

        <h2>Your wishlist is empty</h2>

        <p>
          Tap the heart on any book to save it here.
        </p>

        <Link
          to="/books"
          className="btn btn-dark"
        >
          Explore books
        </Link>
      </div>
    ) : (
      <div className="wishlist-grid">
        {items.map((book) => (
          <article
            className="wishlist-card"
            key={book._id}
          >
            <Link
              to={`/books/${book._id}`}
              className="wishlist-cover"
            >
              <img
                src={book.cover}
                alt={book.title}
                onError={(event) => {
                  event.currentTarget.src =
                    "https://placehold.co/480x640?text=Book";
                }}
              />
            </Link>

            <div className="wishlist-info">
              <div className="book-cat">
                {book.category}
              </div>

              <Link to={`/books/${book._id}`}>
                <h2>{book.title}</h2>
              </Link>

              <p>by {book.author}</p>

              <strong>
                INR{" "}
                {Number(book.price || 0).toLocaleString("en-IN")}
              </strong>

              <div className="wishlist-actions">
                <button
                  className="btn btn-dark small"
                  disabled={!book.stock}
                  onClick={() => add(book)}
                >
                  <ShoppingCart size={15} />

                  {book.stock
                    ? "Add to cart"
                    : "Out of stock"}
                </button>

                <button
                  className="icon-action"
                  onClick={() => remove(book._id)}
                  aria-label={`Remove ${book.title}`}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      )}
      </div>
    </main>  
  );
}
