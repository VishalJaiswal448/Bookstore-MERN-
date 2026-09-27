import { Link } from 'react-router-dom';

export default function Footer(){return <footer>
    <div className="container footer-grid">
        <div>
            <Link to="/" className="brand">Bookestro</Link>
            <p>Find thoughtful reads, trusted sellers and your next favorite book in one place.</p>
        </div>
        <div>
            <b>Explore</b>
            <Link to="/books">All books</Link>
            <Link to="/cart">Cart</Link>
            <Link to="/orders">Orders</Link>
        </div>
        <div>
            <b>Why Bookestro</b>
            <span>Curated reads</span>
            <span>Trusted sellers</span>
            <span>Secure checkout</span>
        </div>
    </div>
    <div className="container footer-bottom">© 2026 Bookestro · Every chapter starts somewhere</div>
</footer>}