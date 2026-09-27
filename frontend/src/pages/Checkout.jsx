import { useEffect, useState } from 'react';
import { ShieldCheck, CreditCard, ArrowLeft, LoaderCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function loadRazorpayScript() {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector('script[data-razorpay]');
    if (existing) { existing.addEventListener('load', () => resolve(true), { once: true }); existing.addEventListener('error', () => resolve(false), { once: true }); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.async = true; script.dataset.razorpay = 'true';
    script.onload = () => resolve(true); script.onerror = () => resolve(false); document.body.appendChild(script);
  });
}

export default function Checkout() {
  const { items, total: cartSubtotal, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: user?.name || '', phone: '', address: '', city: 'Delhi', pincode: '' });
  const [quote, setQuote] = useState({ subtotal: cartSubtotal, delivery: cartSubtotal >= 499 || cartSubtotal === 0 ? 0 : 60, total: cartSubtotal + (cartSubtotal >= 499 || cartSubtotal === 0 ? 0 : 60) });
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => { let mounted = true; loadRazorpayScript().then(ok => { if (mounted) setScriptReady(ok); }); return () => { mounted = false; }; }, []);
  useEffect(() => { if (!items.length) navigate('/cart', { replace: true }); }, [items.length, navigate]);
  if (!items.length) return null;

  const pay = async e => {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      if (!scriptReady || !window.Razorpay) throw new Error('Razorpay checkout could not load. Check your internet connection and try again.');
      const { data: order } = await api.post('/payments/create-order', { items: items.map(i => ({ book: i._id, quantity: i.quantity })), shipping: form });
      setQuote({ subtotal: order.subtotal, delivery: order.delivery, total: order.total });
      const options = {
        key: order.keyId, amount: order.amount, currency: order.currency, name: 'BookBazaar', description: 'Book order', order_id: order.orderId,
        prefill: { name: form.name, email: user?.email || '', contact: form.phone },
        notes: { localOrderId: String(order.localOrderId) },
        theme: { color: '#21372a' },
        handler: async response => {
          try {
            await api.post('/payments/verify', response);
            clear(); navigate('/orders', { replace: true });
          } catch (err) {
            setError(err.response?.data?.message || 'Payment was received but could not be verified automatically. Please contact support.');
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) }
      };
      const checkout = new window.Razorpay(options);
      checkout.on('payment.failed', response => { setError(response?.error?.description || 'Payment failed. Please try again.'); setBusy(false); });
      checkout.open();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not start payment.'); setBusy(false);
    }
  };

  return (
  <main className="section page-top">
    <div className="container narrow checkout-page">
      <Link
        className="back"
        to="/cart"
      >
        <ArrowLeft size={16} />
        Back to cart
      </Link>

      <div className="checkout-intro">
        <div>
          <span className="kicker">
            Secure checkout
          </span>

          <h1>Delivery details</h1>

          <p>
            Your amount is calculated again on the
            server before Razorpay opens.
          </p>
        </div>

        <span className="secure-pill">
          <ShieldCheck size={17} />
          Secure payment
        </span>
      </div>

      <form
        className="checkout-form"
        onSubmit={pay}
      >
        <label>
          Full name

          <input
            required
            maxLength="80"
            autoComplete="name"
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
              })
            }
          />
        </label>

        <label>
          Phone

          <input
            required
            inputMode="numeric"
            maxLength="10"
            autoComplete="tel"
            placeholder="10-digit mobile number"
            value={form.phone}
            onChange={(e) =>
              setForm({
                ...form,
                phone: e.target.value
                  .replace(/\D/g, "")
                  .slice(0, 10),
              })
            }
          />
        </label>

        <label>
          Address

          <textarea
            required
            maxLength="300"
            rows="3"
            autoComplete="street-address"
            value={form.address}
            onChange={(e) =>
              setForm({
                ...form,
                address: e.target.value,
              })
            }
          />
        </label>

        <div className="two">
          <label>
            City

            <input
              required
              maxLength="80"
              autoComplete="address-level2"
              value={form.city}
              onChange={(e) =>
                setForm({
                  ...form,
                  city: e.target.value,
                })
              }
            />
          </label>

          <label>
            Pincode

            <input
              required
              inputMode="numeric"
              maxLength="6"
              pattern="\d{6}"
              autoComplete="postal-code"
              value={form.pincode}
              onChange={(e) =>
                setForm({
                  ...form,
                  pincode: e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6),
                })
              }
            />
          </label>
        </div>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <div className="payment-card">
          <div>
            <b>
              <CreditCard size={17} />
              Razorpay
            </b>

            <span>
              UPI, cards, netbanking and supported
              payment methods.
            </span>
          </div>

          <div className="payment-amount">
            <span>Subtotal</span>

            <b>
              ₹{quote.subtotal.toLocaleString("en-IN")}
            </b>

            <span>Delivery</span>

            <b>
              {quote.delivery
                ? `₹${quote.delivery}`
                : "FREE"}
            </b>

            <strong>
              Total ₹{quote.total.toLocaleString("en-IN")}
            </strong>
          </div>
        </div>

        <button
          className="btn btn-dark wide"
          disabled={busy || !scriptReady}
        >
          {busy ? (
            <>
              <LoaderCircle
                className="spin"
                size={17}
              />
              Opening secure checkout…
            </>
          ) : scriptReady ? (
            <>
              Pay ₹
              {quote.total.toLocaleString("en-IN")}
              {" "}securely
            </>
          ) : (
            "Loading secure checkout…"
          )}
        </button>

        <small>
          Razorpay handles the payment screen. Your
          card/UPI details are not stored by Bookestro.
        </small>
      </form>
    </div>
  </main>
);
}