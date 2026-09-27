import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function Cart() {
  const { items, remove, setQty, total } = useCart();
  const navigate = useNavigate();
  const shipping = total >= 499 || total === 0 ? 0 : 60;
 
  return (
  <main className="section page-top">
    <div className="container">
      <div className="section-head">
        <div>
          <span className="kicker">Your bag</span>
          <h1>Shopping cart</h1>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty large">
          <ShoppingBag size={42} />

          <h2>Your cart is empty</h2>

          <p>
            Browse the collection and add something you’ll love.
          </p>

          <Link
            to="/books"
            className="btn btn-dark"
          >
            Browse books
          </Link>
        </div>
      ) : (
        <div className="cart-grid">
          <div className="cart-list">
            {items.map((i) => (
              <div
                className="cart-item"
                key={i._id}
              >
                <img
                  src={i.cover}
                  alt=""
                />

                <div className="cart-main">
                  <b>{i.title}</b>

                  <span>{i.author}</span>

                  <div className="qty">
                    <button
                      onClick={() =>
                        setQty(
                          i._id,
                          i.quantity - 1
                        )
                      }
                    >
                      <Minus size={14} />
                    </button>

                    <b>{i.quantity}</b>

                    <button
                      disabled={
                        i.quantity >=
                        Number(i.stock || 20)
                      }
                      onClick={() =>
                        setQty(
                          i._id,
                          i.quantity + 1
                        )
                      }
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <strong>
                  ₹{i.price * i.quantity}
                </strong>

                <button
                  className="ghost-icon"
                  onClick={() => remove(i._id)}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>

          <aside className="summary">
            <h3>Order summary</h3>

            <div>
              <span>Subtotal</span>
              <b>₹{total}</b>
            </div>

            <div>
              <span>Shipping</span>
              <b>
                {shipping
                  ? `₹${shipping}`
                  : "FREE"}
              </b>
            </div>

            <hr />

            <div className="summary-total">
              <span>Total</span>
              <b>
                ₹{total + shipping}
              </b>
            </div>

            <button
              className="btn btn-dark wide"
              onClick={() =>
                navigate("/checkout")
              }
            >
              Checkout
              <ArrowRight size={17} />
            </button>
          </aside>
        </div>
      )}
    </div>
  </main>
);
}