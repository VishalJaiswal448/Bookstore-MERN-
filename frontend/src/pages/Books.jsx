import { useEffect, useState } from 'react';
import { Filter, Search, SlidersHorizontal } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import BookCard from '../components/BookCard';

export default function Books() {
  const [params, setParams] = useSearchParams();
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState('');
  const search = params.get('search') || '';
  const category = params.get('category') || '';
  const sort = params.get('sort') || 'newest';
  const minPrice = params.get('min') || '';
  const maxPrice = params.get('max') || '';
  const [draft, setDraft] = useState(search);

  const load = async () => {
    try {
      setError('');
      const { data } = await api.get('/books', { params: { search, category, sort, minPrice, maxPrice } });
      setBooks(Array.isArray(data) ? data : []);
    } catch (err) {
      setBooks([]);
      setError(err.response?.data?.message || 'Could not load the catalogue.');
    }
  };

  useEffect(() => { setDraft(search); }, [search]);
  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const categoryResponse = await api.get('/books/categories');
        if (active) setCategories(Array.isArray(categoryResponse.data) ? categoryResponse.data : []);
      } catch { if (active) setCategories([]); }
    };
    run();
    return () => { active = false; };
  }, []);
  useEffect(() => { load(); }, [search, category, sort, minPrice, maxPrice]);

  const smartSearch = async () => {
    try {
      const { data } = await api.get('/books/recommendations', { params: { q: draft } });
      setRecommendations(Array.isArray(data) ? data : []);
      setParams({ ...(draft ? { search: draft } : {}), ...(category ? { category } : {}), ...(sort !== 'newest' ? { sort } : {}), ...(minPrice ? { min: minPrice } : {}), ...(maxPrice ? { max: maxPrice } : {}) });
    } catch { setRecommendations([]); }
  };

  const updateFilter = (key, value) => {
    const next = Object.fromEntries(params.entries());
    if (value) next[key] = value; else delete next[key];
    setParams(next);
  };

  return (
  <main className="section page-top">
    <div className="container">
      <div className="page-title">
        <div>
          <span className="kicker">Collection</span>

          <h1>All books</h1>

          <p>
            Search the catalogue, filter by category and price,
            then save your favourites.
          </p>
        </div>
      </div>

      <div className="catalog-toolbar enhanced">
        <div className="search-box">
          <Search size={18} />

          <input
            value={draft}
            onChange={(e) =>
              setDraft(e.target.value)
            }
            onKeyDown={(e) =>
              e.key === "Enter" && smartSearch()
            }
            placeholder="Search title, author or category"
          />
        </div>

        <button
          className="btn btn-dark"
          onClick={smartSearch}
        >
          <Filter size={16} />
          Search
        </button>

        <select
          value={category}
          onChange={(e) =>
            updateFilter(
              "category",
              e.target.value
            )
          }
        >
          <option value="">
            All categories
          </option>

          {categories.map((c) => (
            <option key={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) =>
            updateFilter(
              "sort",
              e.target.value
            )
          }
        >
          <option value="newest">
            Newest
          </option>

          <option value="price-asc">
            Price: low to high
          </option>

          <option value="price-desc">
            Price: high to low
          </option>

          <option value="rating">
            Top rated
          </option>
        </select>

        <div className="price-filter">
          <SlidersHorizontal size={15} />

          <input
            aria-label="Minimum price"
            inputMode="numeric"
            placeholder="Min ₹"
            value={minPrice}
            onChange={(e) =>
              updateFilter(
                "min",
                e.target.value
                  .replace(/\D/g, "")
                  .slice(0, 6)
              )
            }
          />

          <span>–</span>

          <input
            aria-label="Maximum price"
            inputMode="numeric"
            placeholder="Max ₹"
            value={maxPrice}
            onChange={(e) =>
              updateFilter(
                "max",
                e.target.value
                  .replace(/\D/g, "")
                  .slice(0, 6)
              )
            }
          />
        </div>
      </div>

      {recommendations.length > 0 && (
        <div className="smart-box">
          <b>Smart matches</b>

          <div>
            {recommendations
              .slice(0, 4)
              .map((r) => (
                <button
                  key={r._id}
                  type="button"
                  onClick={() =>
                    setParams({
                      search: r.title,
                    })
                  }
                >
                  {r.title}
                </button>
              ))}
          </div>
        </div>
      )}

      {error && (
        <div className="error feedback">
          {error}
        </div>
      )}

      <div className="result-count">
        {books.length} books found
      </div>

      <div className="books-grid">
        {books.map((book) => (
          <BookCard
            book={book}
            key={book._id}
          />
        ))}
      </div>

      {books.length === 0 && !error && (
        <div className="empty">
          No books match your current filters.
        </div>
      )}
    </div>
  </main>
);
}