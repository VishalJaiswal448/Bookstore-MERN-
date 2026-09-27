import { useCallback, useEffect, useState } from 'react';
import { Pencil, Trash2, Plus, RefreshCw, Store } from 'lucide-react';
import api from '../services/api';

const blank = { title: '', author: '', description: '', category: '', price: 299, mrp: 399, stock: 10, cover: 'https://placehold.co/480x640?text=Book', rating: 4.2 };
function apiMessage(error, fallback) { return error?.response?.data?.message || error?.message || fallback; }


export default function Seller() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [booksRes, categoryRes] = await Promise.all([
        api.get("/books/mine"),
        api.get("/books/categories"),
      ]);

      setBooks(
        Array.isArray(booksRes.data)
          ? booksRes.data
          : []
      );

      setCategories(
        Array.isArray(categoryRes.data)
          ? categoryRes.data
          : []
      );
    } catch (err) {
      setBooks([]);
      setError(
        apiMessage(
          err,
          "Could not load your seller dashboard."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const [booksRes, categoryRes] =
          await Promise.all([
            api.get("/books/mine"),
            api.get("/books/categories"),
          ]);

        if (!active) return;

        setBooks(
          Array.isArray(booksRes.data)
            ? booksRes.data
            : []
        );

        setCategories(
          Array.isArray(categoryRes.data)
            ? categoryRes.data
            : []
        );
      } catch (err) {
        if (active) {
          setError(
            apiMessage(
              err,
              "Could not load your seller dashboard."
            )
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      active = false;
    };
  }, []);

  const updateField = (field, value) =>
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

  const save = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");
    setSaving(true);

    try {
      if (editing) {
        await api.put(
          `/books/${editing}`,
          form
        );
      } else {
        await api.post("/books", form);
      }

      setMessage(
        editing
          ? "Book updated successfully."
          : "Book added successfully."
      );

      setForm({
        ...blank,
        category: categories[0] || "",
      });

      setEditing(null);

      await load();
    } catch (err) {
      setError(
        apiMessage(
          err,
          "Could not save the book."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const edit = (book) => {
    setEditing(book._id);
    setMessage("");
    setError("");

    setForm({
      title: book.title || "",
      author: book.author || "",
      description: book.description || "",
      category:
        book.category ||
        categories[0] ||
        "",
      price: Number(book.price || 0),
      mrp: Number(book.mrp || 0),
      stock: Number(book.stock || 0),
      cover: book.cover || blank.cover,
      rating: Number(book.rating || 0),
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this book?")) {
      return;
    }

    setDeletingId(id);
    setMessage("");
    setError("");

    try {
      await api.delete(`/books/${id}`);

      setMessage(
        "Book deleted successfully."
      );

      await load();
    } catch (err) {
      setError(
        apiMessage(
          err,
          "Could not delete the book."
        )
      );
    } finally {
      setDeletingId("");
    }
  };

  const cancelEdit = () => {
    setEditing(null);

    setForm({
      ...blank,
      category: categories[0] || "",
    });

    setMessage("");
    setError("");
  };

  return (
    <main className="section page-top">
      <div className="container">
        <div className="page-title">
          <div>
            <span className="kicker">
              <Store size={15} />
              Seller
            </span>

            <h1>Your store</h1>

            <p>
              Manage your own catalogue and keep
              stock accurate.
            </p>
          </div>

          <button
            className="btn btn-dark small"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw
              size={15}
              className={
                loading ? "spin" : ""
              }
            />

            {loading
              ? "Loading…"
              : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="error feedback">
            {error}
          </div>
        )}

        {message && (
          <div className="success feedback">
            {message}
          </div>
        )}

        <form
          className="seller-form"
          onSubmit={save}
        >
          <div className="form-head">
            <h2>
              {editing
                ? "Edit book"
                : "Add a book"}
            </h2>

            {editing && (
              <button
                type="button"
                className="text-btn"
                onClick={cancelEdit}
              >
                Cancel
              </button>
            )}
          </div>

          <div className="two">
            <label>
              Title

              <input
                required
                maxLength="160"
                value={form.title}
                onChange={(e) =>
                  updateField(
                    "title",
                    e.target.value
                  )
                }
              />
            </label>

            <label>
              Author

              <input
                required
                maxLength="120"
                value={form.author}
                onChange={(e) =>
                  updateField(
                    "author",
                    e.target.value
                  )
                }
              />
            </label>
          </div>

          <label>
            Description

            <textarea
              maxLength="4000"
              rows="4"
              value={form.description}
              onChange={(e) =>
                updateField(
                  "description",
                  e.target.value
                )
              }
            />
          </label>

          <div className="three">
            <label>
              Category

              <select
                required
                value={form.category}
                onChange={(e) =>
                  updateField(
                    "category",
                    e.target.value
                  )
                }
              >
                <option value="">
                  Select category
                </option>

                {categories.map((c) => (
                  <option key={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Price

              <input
                type="number"
                min="0"
                required
                value={form.price}
                onChange={(e) =>
                  updateField(
                    "price",
                    Number(e.target.value)
                  )
                }
              />
            </label>

            <label>
              MRP

              <input
                type="number"
                min="0"
                required
                value={form.mrp}
                onChange={(e) =>
                  updateField(
                    "mrp",
                    Number(e.target.value)
                  )
                }
              />
            </label>
          </div>

          <div className="three">
            <label>
              Stock

              <input
                type="number"
                min="0"
                required
                value={form.stock}
                onChange={(e) =>
                  updateField(
                    "stock",
                    Number(e.target.value)
                  )
                }
              />
            </label>

            <label>
              Rating

              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={form.rating}
                onChange={(e) =>
                  updateField(
                    "rating",
                    Number(e.target.value)
                  )
                }
              />
            </label>

            <label>
              Cover URL

              <input
                value={form.cover}
                onChange={(e) =>
                  updateField(
                    "cover",
                    e.target.value
                  )
                }
              />
            </label>
          </div>

          <button
            className="btn btn-dark"
            disabled={
              saving || !categories.length
            }
          >
            <Plus size={17} />

            {saving
              ? "Saving…"
              : editing
              ? "Update book"
              : "Add book"}
          </button>

          {!categories.length && (
            <div className="error">
              No active categories are available.
              Ask an administrator to create one.
            </div>
          )}
        </form>

        <div className="seller-list">
          <div className="list-heading">
            <div>
              <span className="kicker">
                Inventory
              </span>

              <h2>Your books</h2>
            </div>

            <span className="inventory-count">
              {books.length} products
            </span>
          </div>

          {loading ? (
            <div className="empty">
              Loading inventory…
            </div>
          ) : books.length === 0 ? (
            <div className="empty">
              No books found. Add your first
              book above.
            </div>
          ) : (
            books.map((book) => (
              <div
                className="inventory-row"
                key={book._id}
              >
                <img
                  src={
                    book.cover || blank.cover
                  }
                  alt={
                    book.title ||
                    "Book cover"
                  }
                />

                <div>
                  <b>{book.title}</b>

                  <span>
                    {book.author} ·{" "}
                    {book.category} · ₹
                    {Number(
                      book.price || 0
                    ).toLocaleString("en-IN")}{" "}
                    ·{" "}
                    <strong
                      className={
                        Number(book.stock) <= 5
                          ? "danger-text"
                          : ""
                      }
                    >
                      {Number(
                        book.stock || 0
                      )}{" "}
                      in stock
                    </strong>
                  </span>
                </div>

                <div className="row-actions">
                  <button
                    type="button"
                    className="icon-action"
                    onClick={() =>
                      edit(book)
                    }
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    type="button"
                    className="icon-action danger"
                    disabled={
                      deletingId === book._id
                    }
                    onClick={() =>
                      remove(book._id)
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}