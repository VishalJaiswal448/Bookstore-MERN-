import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import api from '../services/api';

export default function Orders() {
  const [orders, setOrders] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

const load = useCallback(async () => {
  setLoading(true);
  setError("");

  try {
    const { data } = await api.get("/orders/mine");

    setOrders(Array.isArray(data) ? data : []);
  } catch (err) {
    setError(
      err.response?.data?.message ||
        "Could not load your orders."
    );
  } finally {
    setLoading(false);
  }
}, []);

useEffect(() => {
  load();
}, [load]);
  
  return (
  <main className="section page-top">
    <div className="container">
      <div className="page-title">
        <div>
          <span className="kicker">
            Account
          </span>

          <h1>Your orders</h1>

          <p>
            Payment and delivery status for your
            Book purchases.
          </p>
        </div>

        <button
          className="btn btn-dark small"
          onClick={load}
          disabled={loading}
        >
          <RefreshCw size={15} />

          {loading
            ? "Loading…"
            : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading-card">
          Loading orders…
        </div>
      ) : orders.length ? (
        <div className="orders">
          {orders.map((o) => (
            <article
              className="order-card"
              key={o._id}
            >
              <div className="order-head">
                <div>
                  <b>
                    Order #
                    {String(o._id)
                      .slice(-8)
                      .toUpperCase()}
                  </b>

                  <span>
                    {new Date(
                      o.createdAt
                    ).toLocaleDateString("en-IN")}
                  </span>
                </div>

                <div className="order-badges">
                  <span className="status">
                    {o.status}
                  </span>

                  <span
                    className={`payment-status ${o.paymentStatus}`}
                  >
                    {o.paymentStatus === "paid"
                      ? "Paid"
                      : "Payment pending"}
                  </span>
                </div>
              </div>

              <div className="order-items">
                {(o.items || []).map((i) => (
                  <div
                    key={`${o._id}-${i.book}`}
                  >
                    <img
                      src={i.cover}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://placehold.co/100x140?text=Book";
                      }}
                    />

                    <span>
                      {i.title} × {i.quantity}
                    </span>

                    <b>
                      ₹
                      {(
                        i.price * i.quantity
                      ).toLocaleString("en-IN")}
                    </b>
                  </div>
                ))}
              </div>

              <div className="order-total">
                <span>
                  Items ₹
                  {Number(
                    o.subtotal || o.total
                  ).toLocaleString("en-IN")}
                  {" · "}
                  Delivery{" "}
                  {Number(o.delivery || 0)
                    ? `₹${o.delivery}`
                    : "FREE"}
                </span>

                <b>
                  Total ₹
                  {Number(
                    o.total || 0
                  ).toLocaleString("en-IN")}
                </b>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty large">
          <h2>
            You have no orders yet.
          </h2>
        </div>
      )}
    </div>
  </main>
);
}