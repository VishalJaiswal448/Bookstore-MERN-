import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Boxes, Check, FolderCog, Package, Plus, RefreshCw, Search, ShieldCheck, ShoppingCart, Trash2, Users, X } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUS_OPTIONS = ['Placed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];
const emptyProduct = { title: '', author: '', description: '', category: '', price: 299, mrp: 399, stock: 10, cover: 'https://placehold.co/480x640?text=Book', rating: 4.2, sellerId: '' };
const emptyCategory = { name: '', description: '' };

function messageOf(error, fallback) { return error?.response?.data?.message || error?.message || fallback; }

export default function Admin() {
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState('overview');
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [books, setBooks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productForm, setProductForm] = useState(emptyProduct);
  const [editingProduct, setEditingProduct] = useState(null);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [editingCategory, setEditingCategory] = useState(null);
  const [updatingUser, setUpdatingUser] = useState('');
  const [updatingOrder, setUpdatingOrder] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [dash, userRes, catRes, bookRes, orderRes] = await Promise.all([
        api.get('/admin/dashboard'), api.get('/admin/users'), api.get('/admin/categories'), api.get('/books'), api.get('/orders')
      ]);
      setDashboard(dash.data || null);
      setUsers(Array.isArray(userRes.data) ? userRes.data : []);
      setCategories(Array.isArray(catRes.data) ? catRes.data : []);
      setBooks(Array.isArray(bookRes.data) ? bookRes.data : []);
      setOrders(Array.isArray(orderRes.data) ? orderRes.data : []);
    } catch (err) {
      setError(messageOf(err, 'Could not load the admin panel.'));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const sellers = useMemo(() => users.filter(user => user.role === 'seller' && user.isActive), [users]);
  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(user => `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(q));
  }, [users, userSearch]);
  const filteredBooks = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return books;
    return books.filter(book => `${book.title} ${book.author} ${book.category} ${book.seller?.name || ''}`.toLowerCase().includes(q));
  }, [books, productSearch]);

  const clearFeedback = () => { setError(''); setMessage(''); };

  const updateUser = async (id, patch) => {
    setUpdatingUser(id); clearFeedback();
    try {
      const { data } = await api.patch(`/admin/users/${id}`, patch);
      setUsers(current => current.map(user => user._id === id ? { ...user, ...data.user } : user));
      setMessage('User updated successfully.');
    } catch (err) { setError(messageOf(err, 'Could not update user.')); }
    finally { setUpdatingUser(''); }
  };

  const updateOrder = async (id, status) => {
    setUpdatingOrder(id); clearFeedback();
    try {
      const { data } = await api.patch(`/orders/${id}`, { status });
      setOrders(current => current.map(order => order._id === id ? data : order));
      setMessage(`Order ${String(id).slice(-8).toUpperCase()} updated.`);
    } catch (err) { setError(messageOf(err, 'Could not update order.')); }
    finally { setUpdatingOrder(''); }
  };

  const saveProduct = async (e) => {
    e.preventDefault(); clearFeedback();
    if (!productForm.sellerId) return setError('Select a seller for the product.');
    setSaving(true);
    try {
      const payload = { ...productForm, price: Number(productForm.price), mrp: Number(productForm.mrp), stock: Number(productForm.stock), rating: Number(productForm.rating) };
      if (editingProduct) await api.put(`/books/${editingProduct}`, payload);
      else await api.post('/books', payload);
      setMessage(editingProduct ? 'Product updated.' : 'Product created.');
      setProductForm({ ...emptyProduct, category: categories.find(c => c.isActive)?.name || '', sellerId: sellers[0]?._id || '' });
      setEditingProduct(null);
      await loadAll();
    } catch (err) { setError(messageOf(err, 'Could not save product.')); }
    finally { setSaving(false); }
  };

  const editProduct = book => {
    setEditingProduct(book._id); clearFeedback();
    setProductForm({ title: book.title || '', author: book.author || '', description: book.description || '', category: book.category || '', price: Number(book.price || 0), mrp: Number(book.mrp || 0), stock: Number(book.stock || 0), cover: book.cover || emptyProduct.cover, rating: Number(book.rating || 0), sellerId: book.seller?._id || book.seller || sellers[0]?._id || '' });
    setTab('products'); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteProduct = async id => {
    if (!window.confirm('Delete this product? This also removes it from wishlists.')) return;
    clearFeedback();
    try { await api.delete(`/books/${id}`); setMessage('Product deleted.'); await loadAll(); }
    catch (err) { setError(messageOf(err, 'Could not delete product.')); }
  };

  const saveCategory = async e => {
    e.preventDefault(); clearFeedback(); setSaving(true);
    try {
      if (editingCategory) await api.put(`/admin/categories/${editingCategory}`, { ...categoryForm });
      else await api.post('/admin/categories', categoryForm);
      setMessage(editingCategory ? 'Category updated.' : 'Category created.');
      setCategoryForm(emptyCategory); setEditingCategory(null); await loadAll();
    } catch (err) { setError(messageOf(err, 'Could not save category.')); }
    finally { setSaving(false); }
  };

  const archiveCategory = async id => {
    const category = categories.find(item => item._id === id);
    if (!category) return;
    if (!window.confirm(category.isActive ? 'Archive this category?' : 'Activate this category?')) return;
    clearFeedback();
    try {
      const { data } = category.isActive ? await api.delete(`/admin/categories/${id}`) : await api.put(`/admin/categories/${id}`, { name: category.name, description: category.description || '', isActive: true });
      setMessage(data.message || (category.isActive ? 'Category archived.' : 'Category activated.'));
      await loadAll();
    } catch (err) { setError(messageOf(err, 'Could not change category.')); }
  };

  const stat = dashboard?.stats || {};
  const tabItems = [
    ['overview', 'Overview', BarChart3], ['users', 'Users', Users], ['products', 'Products', Package], ['categories', 'Categories', FolderCog], ['orders', 'Orders', ShoppingCart], ['inventory', 'Inventory', Boxes]
  ];

return (
  <main className="section page-top admin-page">
    <div className="container admin-container">

      {/* ==================== ADMIN HEADER ==================== */}

      <div className="admin-heading">
        <div>
          <span className="kicker">
            <ShieldCheck size={15} />
            Administrator
          </span>

          <h1>Store control panel</h1>

          <p>
            Manage customers, sellers, products, categories,
            orders and inventory.
          </p>
        </div>

        <button
          className="btn btn-dark small"
          onClick={loadAll}
          disabled={loading}
        >
          <RefreshCw
            size={15}
            className={loading ? "spin" : ""}
          />
          Refresh
        </button>
      </div>


      {/* ==================== FEEDBACK MESSAGES ==================== */}

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


      <div className="admin-layout">

        {/* ==================== SIDEBAR ==================== */}

        <aside className="admin-sidebar">
          {tabItems.map(([key, label, Icon]) => (
            <button
              key={key}
              className={tab === key ? "active" : ""}
              onClick={() => {
                setTab(key);
                clearFeedback();
              }}
            >
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </aside>


        {/* ==================== MAIN CONTENT ==================== */}

        <section className="admin-content">

          {/* ==================================================
              DASHBOARD / OVERVIEW
          ================================================== */}

          {tab === "overview" && (
            <>
              {/* Statistics */}

              <div className="stats-grid admin-stats">

                <div>
                  <span>Total users</span>

                  <b>
                    {loading ? "—" : stat.users || 0}
                  </b>

                  <small>
                    {stat.customers || 0} customers ·{" "}
                    {stat.sellers || 0} sellers
                  </small>
                </div>


                <div>
                  <span>Products</span>

                  <b>
                    {loading ? "—" : stat.books || 0}
                  </b>

                  <small>
                    Across all seller stores
                  </small>
                </div>


                <div>
                  <span>Orders</span>

                  <b>
                    {loading ? "—" : stat.orders || 0}
                  </b>

                  <small>
                    Payment and fulfilment
                  </small>
                </div>


                <div>
                  <span>Revenue</span>

                  <b>
                    {loading
                      ? "—"
                      : `₹${Number(
                          stat.revenue || 0
                        ).toLocaleString("en-IN")}`}
                  </b>

                  <small>
                    Paid, non-cancelled orders
                  </small>
                </div>

              </div>


              {/* ==================== RECENT ORDERS ==================== */}

              <div className="admin-card">

                <div className="card-heading">
                  <div>
                    <span className="kicker">
                      Fulfilment
                    </span>

                    <h2>Recent orders</h2>
                  </div>

                  <button
                    className="text-btn"
                    onClick={() => setTab("orders")}
                  >
                    View all
                  </button>
                </div>


                {(dashboard?.recentOrders || []).length === 0 ? (

                  <div className="empty">
                    No orders yet.
                  </div>

                ) : (

                  <div className="table-wrap">
                    <table className="admin-table">

                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>Customer</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {dashboard.recentOrders.map((o) => (
                          <tr key={o._id}>

                            <td>
                              #{String(o._id)
                                .slice(-8)
                                .toUpperCase()}
                            </td>

                            <td>
                              {o.customer?.name ||
                                o.customer?.email ||
                                "Customer"}
                            </td>

                            <td>
                              ₹
                              {Number(
                                o.total || 0
                              ).toLocaleString("en-IN")}
                            </td>

                            <td>
                              <span className="status">
                                {o.status}
                              </span>
                            </td>

                          </tr>
                        ))}
                      </tbody>

                    </table>
                  </div>

                )}

              </div>


              {/* ==================== LOW STOCK ==================== */}

              <div className="admin-card">

                <div className="card-heading">
                  <div>
                    <span className="kicker">
                      Inventory alert
                    </span>

                    <h2>Low stock</h2>
                  </div>

                  <button
                    className="text-btn"
                    onClick={() => setTab("inventory")}
                  >
                    Manage inventory
                  </button>
                </div>


                {(dashboard?.lowStock || []).length === 0 ? (

                  <div className="empty">
                    Everything is comfortably stocked.
                  </div>

                ) : (

                  <div className="low-stock-grid">

                    {dashboard.lowStock.map((book) => (
                      <div key={book._id}>

                        <div>
                          <b>{book.title}</b>

                          <span>
                            {book.seller?.name || "Seller"}
                          </span>
                        </div>

                        <strong
                          className={
                            Number(book.stock) <= 2
                              ? "danger-text"
                              : ""
                          }
                        >
                          {book.stock} left
                        </strong>

                      </div>
                    ))}

                  </div>

                )}

              </div>
            </>
          )}


          {/* ==================================================
              USER MANAGEMENT
          ================================================== */}

          {tab === "users" && (
            <div className="admin-card">

              <div className="card-heading">

                <div>
                  <span className="kicker">
                    User management
                  </span>

                  <h2>
                    Customers, sellers & administrators
                  </h2>
                </div>


                <div className="search-box admin-search">
                  <Search size={17} />

                  <input
                    value={userSearch}
                    onChange={(e) =>
                      setUserSearch(e.target.value)
                    }
                    placeholder="Search users"
                  />
                </div>

              </div>


              <div className="table-wrap">
                <table className="admin-table">

                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th>Action</th>
                    </tr>
                  </thead>


                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user._id}>

                        <td>
                          <b>{user.name}</b>

                          <span className="table-sub">
                            {user.email}
                          </span>
                        </td>


                        <td>
                          <select
                            className="table-select"
                            value={user.role}
                            disabled={
                              updatingUser === user._id ||
                              user._id === currentUser?.id
                            }
                            onChange={(e) =>
                              updateUser(user._id, {
                                role: e.target.value,
                              })
                            }
                          >
                            <option value="customer">
                              Customer
                            </option>

                            <option value="seller">
                              Seller
                            </option>

                            <option value="admin">
                              Admin
                            </option>
                          </select>
                        </td>


                        <td>
                          <span
                            className={`user-status ${
                              user.isActive
                                ? "active"
                                : "inactive"
                            }`}
                          >
                            {user.isActive
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>


                        <td>
                          {new Date(
                            user.createdAt
                          ).toLocaleDateString("en-IN")}
                        </td>


                        <td>
                          <button
                            className={`btn small ${
                              user.isActive
                                ? "btn-outline"
                                : "btn-dark"
                            }`}
                            disabled={
                              updatingUser === user._id ||
                              user._id === currentUser?.id
                            }
                            onClick={() =>
                              updateUser(user._id, {
                                isActive: !user.isActive,
                              })
                            }
                          >
                            {user.isActive
                              ? "Deactivate"
                              : "Activate"}
                          </button>
                        </td>

                      </tr>
                    ))}
                  </tbody>

                </table>
              </div>

            </div>
          )}


          {/* ==================================================
              PRODUCT MANAGEMENT
          ================================================== */}

          {tab === "products" && (
            <div className="admin-card">

              <div className="card-heading">

                <div>
                  <span className="kicker">
                    Product management
                  </span>

                  <h2>
                    {editingProduct
                      ? "Edit product"
                      : "Add product"}
                  </h2>
                </div>


                {editingProduct && (
                  <button
                    className="text-btn"
                    onClick={() => {
                      setEditingProduct(null);

                      setProductForm({
                        ...emptyProduct,
                        category:
                          categories.find(
                            (c) => c.isActive
                          )?.name || "",
                        sellerId:
                          sellers[0]?._id || "",
                      });
                    }}
                  >
                    Cancel edit
                  </button>
                )}

              </div>


              {/* Product Form */}

              <form
                className="admin-form"
                onSubmit={saveProduct}
              >

                <div className="two">

                  <label>
                    Title

                    <input
                      required
                      maxLength="160"
                      value={productForm.title}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          title: e.target.value,
                        })
                      }
                    />
                  </label>


                  <label>
                    Author

                    <input
                      required
                      maxLength="120"
                      value={productForm.author}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          author: e.target.value,
                        })
                      }
                    />
                  </label>

                </div>


                <label>
                  Description

                  <textarea
                    maxLength="4000"
                    rows="4"
                    value={productForm.description}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        description: e.target.value,
                      })
                    }
                  />
                </label>


                <div className="three">

                  <label>
                    Category

                    <select
                      required
                      value={productForm.category}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          category: e.target.value,
                        })
                      }
                    >
                      <option value="">
                        Select category
                      </option>

                      {categories
                        .filter((c) => c.isActive)
                        .map((c) => (
                          <option
                            key={c._id}
                            value={c.name}
                          >
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </label>


                  <label>
                    Seller

                    <select
                      required
                      value={productForm.sellerId}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          sellerId: e.target.value,
                        })
                      }
                    >
                      <option value="">
                        Select seller
                      </option>

                      {sellers.map((s) => (
                        <option
                          key={s._id}
                          value={s._id}
                        >
                          {s.name}
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
                      value={productForm.price}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          price: e.target.value,
                        })
                      }
                    />
                  </label>

                </div>


                <div className="three">

                  <label>
                    MRP

                    <input
                      type="number"
                      min="0"
                      required
                      value={productForm.mrp}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          mrp: e.target.value,
                        })
                      }
                    />
                  </label>


                  <label>
                    Stock

                    <input
                      type="number"
                      min="0"
                      required
                      value={productForm.stock}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          stock: e.target.value,
                        })
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
                      value={productForm.rating}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          rating: e.target.value,
                        })
                      }
                    />
                  </label>

                </div>


                <label>
                  Cover URL

                  <input
                    value={productForm.cover}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        cover: e.target.value,
                      })
                    }
                  />
                </label>


                <button
                  className="btn btn-dark"
                  disabled={
                    saving || sellers.length === 0
                  }
                >
                  <Plus size={16} />

                  {saving
                    ? "Saving…"
                    : editingProduct
                    ? "Update product"
                    : "Add product"}
                </button>


                {sellers.length === 0 && (
                  <div className="error">
                    Create/activate a seller account
                    before adding products.
                  </div>
                )}

              </form>


              {/* ==================== PRODUCT LIST ==================== */}

              <div className="card-heading split">

                <h2>All products</h2>

                <div className="search-box admin-search">
                  <Search size={17} />

                  <input
                    value={productSearch}
                    onChange={(e) =>
                      setProductSearch(e.target.value)
                    }
                    placeholder="Search products"
                  />
                </div>

              </div>


              <div className="table-wrap">
                <table className="admin-table">

                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Seller</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Actions</th>
                    </tr>
                  </thead>


                  <tbody>
                    {filteredBooks.map((book) => (
                      <tr key={book._id}>

                        <td>
                          <div className="product-cell">

                            <img
                              src={book.cover}
                              alt=""
                            />

                            <div>
                              <b>{book.title}</b>

                              <span>
                                {book.category} ·{" "}
                                {book.author}
                              </span>
                            </div>

                          </div>
                        </td>


                        <td>
                          {book.seller?.name ||
                            "Unknown"}
                        </td>


                        <td>
                          ₹
                          {Number(
                            book.price
                          ).toLocaleString("en-IN")}
                        </td>


                        <td>
                          <span
                            className={
                              Number(book.stock) <= 5
                                ? "danger-text"
                                : ""
                            }
                          >
                            {book.stock}
                          </span>
                        </td>


                        <td>
                          <div className="row-actions">

                            <button
                              onClick={() =>
                                editProduct(book)
                              }
                              className="icon-action"
                              aria-label="Edit product"
                            >
                              ✎
                            </button>


                            <button
                              onClick={() =>
                                deleteProduct(book._id)
                              }
                              className="icon-action danger"
                              aria-label="Delete product"
                            >
                              <Trash2 size={16} />
                            </button>

                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>

                </table>
              </div>

            </div>
          )}


          {/* ==================================================
              CATEGORY MANAGEMENT
          ================================================== */}

          {tab === "categories" && (
            <div className="admin-card">

              <div className="card-heading">

                <div>
                  <span className="kicker">
                    Category management
                  </span>

                  <h2>
                    {editingCategory
                      ? "Edit category"
                      : "Create category"}
                  </h2>
                </div>


                {editingCategory && (
                  <button
                    className="text-btn"
                    onClick={() => {
                      setEditingCategory(null);
                      setCategoryForm(emptyCategory);
                    }}
                  >
                    Cancel edit
                  </button>
                )}

              </div>


              {/* Category Form */}

              <form
                className="admin-form compact-form"
                onSubmit={saveCategory}
              >

                <div className="two">

                  <label>
                    Name

                    <input
                      required
                      maxLength="80"
                      value={categoryForm.name}
                      onChange={(e) =>
                        setCategoryForm({
                          ...categoryForm,
                          name: e.target.value,
                        })
                      }
                    />
                  </label>


                  <label>
                    Description

                    <input
                      maxLength="300"
                      value={categoryForm.description}
                      onChange={(e) =>
                        setCategoryForm({
                          ...categoryForm,
                          description: e.target.value,
                        })
                      }
                    />
                  </label>

                </div>


                <button
                  className="btn btn-dark"
                  disabled={saving}
                >
                  <Plus size={16} />

                  {saving
                    ? "Saving…"
                    : editingCategory
                    ? "Update category"
                    : "Create category"}
                </button>

              </form>


              {/* Category List */}

              <div className="category-admin-grid">

                {categories.map((category) => (
                  <div
                    className={`category-admin-card ${
                      !category.isActive
                        ? "inactive"
                        : ""
                    }`}
                    key={category._id}
                  >

                    <div>
                      <b>{category.name}</b>

                      <span>
                        {category.description ||
                          "No description"}
                      </span>
                    </div>


                    <div className="category-meta">

                      <span>
                        {category.isActive
                          ? "Active"
                          : "Archived"}
                      </span>


                      <div className="row-actions">

                        <button
                          className="icon-action"
                          onClick={() => {
                            setEditingCategory(
                              category._id
                            );

                            setCategoryForm({
                              name: category.name,
                              description:
                                category.description ||
                                "",
                            });
                          }}
                        >
                          ✎
                        </button>


                        <button
                          className="icon-action danger"
                          onClick={() =>
                            archiveCategory(
                              category._id
                            )
                          }
                        >
                          {category.isActive ? (
                            <X size={16} />
                          ) : (
                            <Check size={16} />
                          )}
                        </button>

                      </div>

                    </div>

                  </div>
                ))}

              </div>

            </div>
          )}


          {/* ==================================================
              ORDER MANAGEMENT
          ================================================== */}

          {tab === "orders" && (
            <div className="admin-card">

              <div className="card-heading">
                <div>
                  <span className="kicker">
                    Order management
                  </span>

                  <h2>Customer orders</h2>
                </div>
              </div>


              {orders.length === 0 ? (

                <div className="empty">
                  No orders yet.
                </div>

              ) : (

                <div className="admin-order-list">

                  {orders.map((order) => (
                    <div
                      className="admin-order-full"
                      key={order._id}
                    >

                      {/* Order Information */}

                      <div className="order-main">

                        <div className="order-main-head">

                          <b>
                            #
                            {String(order._id)
                              .slice(-8)
                              .toUpperCase()}
                          </b>

                          <span>
                            {new Date(
                              order.createdAt
                            ).toLocaleString("en-IN")}
                          </span>

                        </div>


                        <p>
                          {order.customer?.name ||
                            "Customer"}{" "}
                          ·{" "}
                          {order.customer?.email || ""}
                        </p>


                        <div className="order-mini-items">

                          {(order.items || [])
                            .slice(0, 3)
                            .map((item) => (
                              <span key={item.book}>
                                {item.title} ×{" "}
                                {item.quantity}
                              </span>
                            ))}

                        </div>

                      </div>


                      {/* Order Status */}

                      <div className="order-main-side">

                        <strong>
                          ₹
                          {Number(
                            order.total || 0
                          ).toLocaleString("en-IN")}
                        </strong>


                        <span
                          className={`payment-status ${
                            order.paymentStatus
                          }`}
                        >
                          {order.paymentStatus}
                        </span>


                        <select
                          value={order.status}
                          disabled={
                            updatingOrder === order._id
                          }
                          onChange={(e) =>
                            updateOrder(
                              order._id,
                              e.target.value
                            )
                          }
                        >
                          {STATUS_OPTIONS.map(
                            (option) => (
                              <option
                                key={option}
                              >
                                {option}
                              </option>
                            )
                          )}
                        </select>

                      </div>

                    </div>
                  ))}

                </div>

              )}

            </div>
          )}


          {/* ==================================================
              INVENTORY MANAGEMENT
          ================================================== */}

          {tab === "inventory" && (
            <div className="admin-card">

              <div className="card-heading">

                <div>
                  <span className="kicker">
                    Inventory management
                  </span>

                  <h2>
                    Stock across the store
                  </h2>
                </div>


                <button
                  className="text-btn"
                  onClick={() =>
                    setTab("products")
                  }
                >
                  Edit products
                </button>

              </div>


              <div className="inventory-dashboard-grid">

                {[...books]
                  .sort(
                    (a, b) =>
                      Number(a.stock) -
                      Number(b.stock)
                  )
                  .map((book) => (
                    <div
                      className="inventory-admin-row"
                      key={book._id}
                    >

                      <img
                        src={book.cover}
                        alt=""
                      />


                      <div>
                        <b>{book.title}</b>

                        <span>
                          {book.seller?.name ||
                            "Seller"}{" "}
                          · {book.category}
                        </span>
                      </div>


                      <strong
                        className={
                          Number(book.stock) <= 5
                            ? "danger-text"
                            : ""
                        }
                      >
                        {book.stock}{" "}
                        {Number(book.stock) === 1
                          ? "copy"
                          : "copies"}
                      </strong>


                      <button
                        className="btn btn-outline small"
                        onClick={() =>
                          editProduct(book)
                        }
                      >
                        Manage
                      </button>

                    </div>
                  ))}

              </div>

            </div>
          )}

        </section>
      </div>
    </div>
  </main>
);
}
