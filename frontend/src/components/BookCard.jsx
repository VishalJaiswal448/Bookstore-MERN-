import { Heart, ShoppingCart, Star } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';

export default function BookCard({ book }) {
  const { add } = useCart();
  const { user } = useAuth();
  const { has, toggle } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();
  const saved = has(book._id);
  const discount = book.mrp > book.price ? Math.round((1 - book.price / book.mrp) * 100) : 0;

  const handleWishlist = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user) {
      navigate('/login', { state: { from: location.pathname + location.search } });
      return;
    }
    try { await toggle(book); } catch { /* API errors are handled on the next interaction. */ }
  };

  return (
    <article className="book-card">
      <Link to={`/books/${book._id}`} className="cover-wrap">
        <img src={book.cover} alt={book.title} onError={e => { e.currentTarget.src = 'https://placehold.co/480x640?text=Book'; }}/>
        {discount > 0 && <span className="badge">{discount}% OFF</span>}
        {user?.role === 'customer' && <button className={`wishlist-heart ${saved ? 'saved' : ''}`} onClick={handleWishlist} aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}><Heart size={17} fill={saved ? 'currentColor' : 'none'}/></button>}
      </Link>
      <div className="book-info">
        <div className="book-cat">{book.category}</div>
        <Link to={`/books/${book._id}`}><h3>{book.title}</h3>
        </Link>
        <p className="author">by {book.author}</p>
        <div className="rating">
          <Star size={14} fill="currentColor"/> {book.rating?.toFixed?.(1) || book.rating} <span>· {book.sold || 0} sold</span>
        </div>
        <div className="card-bottom">
      <div>
        <strong>₹{book.price}</strong>{book.mrp > book.price && <del>₹{book.mrp}</del>}    </div>
        <button className="circle-add" disabled={!book.stock} onClick={() => add(book)} aria-label={book.stock ? 'Add to cart' : 'Out of stock'}>
          <ShoppingCart size={17}/>
        </button>
      </div>
    </div>
    </article>
  );
}
