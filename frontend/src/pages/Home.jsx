import { useEffect, useState } from 'react';
import { ArrowRight, Search, Sparkles, ShieldCheck, Truck, BookOpenCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import BookCard from '../components/BookCard';

export default function Home() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [bookResponse, categoryResponse] = await Promise.all([api.get('/books'), api.get('/books/categories')]);
        if (active) { setBooks(Array.isArray(bookResponse.data) ? bookResponse.data : []); setCategories(Array.isArray(categoryResponse.data) ? categoryResponse.data : []); }
      } catch {
        if (active) { setBooks([]); setCategories([]); }
      }
    };
    load();
    return () => { active = false; };
  }, []);
  const featured = books.slice(0, 4);
  const popular = [...books].sort((a, b) => (b.sold || 0) - (a.sold || 0)).slice(0, 4);
  const submit = e => { e.preventDefault(); navigate(`/books${query.trim() ? `?search=${encodeURIComponent(query.trim())}` : ''}`); };
  const categoryIcons = ['FI', 'PR', 'FN', 'SH', 'BI', 'CO'];

return (
  <>
    <section className="hero">
      <div className="container hero-grid">
        <div>
          <span className="eyebrow">
            <Sparkles size={15} />
            Best online bookstore
          </span>

          <h1>
            Find a book you’ll want to <em>keep.</em>
          </h1>

          <p>
            Explore fiction, finance, programming, self-help
            and more from best sellers.
          </p>

          <form
            className="hero-search"
            onSubmit={submit}
          >
            <Search size={19} />

            <input
              value={query}
              onChange={(e) =>
                setQuery(e.target.value)
              }
              placeholder="Search title, author or category"
            />

            <button className="btn btn-dark">
              Search
            </button>
          </form>

          <div className="hero-pills">
            <span>Free delivery over ₹499</span>
            <span>Wishlist &amp; saved books</span>
            <span>100% Genuine books</span>
          </div>
        </div>

        <div className="hero-stack">
          <div className="stack-card one">
            <img
              src={
                books[0]?.cover ||
                "https://placehold.co/480x640?text=Book"
              }
            />
          </div>

          <div className="stack-card two">
            <img
              src={
                books[3]?.cover ||
                "https://placehold.co/480x640?text=Book"
              }
            />
          </div>

          <div className="stack-note">
            <BookOpenCheck size={20} />

            <b>Smart picks</b>

            <span>
              Search, save and shop in one place.
            </span>
          </div>
        </div>
      </div>
    </section>

    <section className="feature-strip">
      <div className="container feature-grid">
        <div>
          <ShieldCheck />
          <b>Secure checkout</b>
          <span>Protected account sessions</span>
        </div>

        <div>
          <Truck />
          <b>Track every order</b>
          <span>Simple order history</span>
        </div>

        <div>
          <BookOpenCheck />
          <b>Seller variety</b>
          <span>Books from multiple stores</span>
        </div>
      </div>
    </section>

    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="kicker">Browse</span>
            <h2>Shop by category</h2>
          </div>

          <Link to="/books">
            View all
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="category-grid">
          {categories.map((c, index) => (
            <Link
              key={c}
              to={`/books?category=${encodeURIComponent(c)}`}
              className="category-card"
            >
              <span>
                {
                  categoryIcons[
                    index % categoryIcons.length
                  ]
                }
              </span>

              <b>{c}</b>

              <ArrowRight size={16} />
            </Link>
          ))}
        </div>

        {categories.length === 0 && (
          <div className="empty">
            Categories will appear here once the
            catalogue is loaded.
          </div>
        )}
      </div>
    </section>

    <section className="section soft">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="kicker">Featured</span>
            <h2>New on the shelf</h2>
          </div>

          <Link to="/books">
            See everything
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="books-grid">
          {featured.map((book) => (
            <BookCard
              book={book}
              key={book._id}
            />
          ))}
        </div>

        {featured.length === 0 && (
          <div className="empty">
            No books have been added yet.
          </div>
        )}
      </div>
    </section>

    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="kicker">Popular</span>
            <h2>Readers are buying</h2>
          </div>
        </div>

        <div className="books-grid">
          {popular.map((book) => (
            <BookCard
              book={book}
              key={book._id}
            />
          ))}
        </div>
      </div>
    </section>
  </>
);
}