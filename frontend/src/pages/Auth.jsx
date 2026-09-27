import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Auth({ mode = 'login' }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'customer' });
  const [error, setError] = useState('');

  const submit = async e => {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const next = mode === 'login' ? await login(form.email, form.password) : await register(form);
      const fallback = next?.role === 'admin' ? '/admin/dashboard' : next?.role === 'seller' ? '/seller' : '/';
      navigate(location.state?.from || fallback, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally { setBusy(false); }
  };

  return <main className="auth-shell">
  <div className="auth-layout">
    <div className="auth-intro">
      <span className="eyebrow">
        <LockKeyhole size={15} />
        Secure account
      </span>

      <h1>
        Books that fit your <em>next chapter.</em>
      </h1>

      <p>
        Shop independent sellers, save your favourites and pay securely
        with Razorpay.
      </p>

      
    </div>

    <div className="auth-card">
      <div className="auth-brand">
        Bookestro
      </div>

      <span className="kicker">
        {mode === "login"
          ? "Welcome back"
          : "Join the marketplace"}
      </span>

      <h2>
        {mode === "login"
          ? "Sign in"
          : "Create your account"}
      </h2>

      <p>
        {mode === "login"
          ? "Access your cart, orders and role-based tools."
          : "Shop as a reader or start selling books."}
      </p>

      <form onSubmit={submit}>
        {mode === "register" && (
          <label>
            Name

            <input
              autoComplete="name"
              required
              maxLength="80"
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                })
              }
            />
          </label>
        )}

        <label>
          Email

          <input
            type="email"
            autoComplete="email"
            required
            maxLength="160"
            value={form.email}
            onChange={(e) =>
              setForm({
                ...form,
                email: e.target.value,
              })
            }
          />
        </label>

        <label>
          Password

          <div className="password-input">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete={
                mode === "login"
                  ? "current-password"
                  : "new-password"
              }
              required
              minLength="8"
              maxLength="128"
              value={form.password}
              onChange={(e) =>
                setForm({
                  ...form,
                  password: e.target.value,
                })
              }
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword((v) => !v)
              }
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showPassword ? (
                <EyeOff size={17} />
              ) : (
                <Eye size={17} />
              )}
            </button>
          </div>
        </label>

        {mode === "register" && (
          <label>
            Account type

            <select
              value={form.role}
              onChange={(e) =>
                setForm({
                  ...form,
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
            </select>
          </label>
        )}

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <button
          className="btn btn-dark wide"
          disabled={busy}
        >
          {busy ? (
            "Please wait…"
          ) : mode === "login" ? (
            <>
              Sign in
              <ArrowRight size={17} />
            </>
          ) : (
            <>
              Create account
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>

      

      <p className="auth-switch">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link to="/register">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already registered?{" "}
            <Link to="/login">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  </div>
</main>;
}