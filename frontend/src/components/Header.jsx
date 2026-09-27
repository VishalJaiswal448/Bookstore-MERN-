import { Heart, BookOpen, ShoppingCart, User, LogOut, Store, LayoutDashboard, Menu, X, Sun, Moon } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useTheme } from '../context/theme';

export default function Header() {
  const { user, logout } = useAuth();
  const { count: cartCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const links = [
    ['Home', '/'], ['Books', '/books'],
    ...(user?.role === 'customer' ? [['Orders', '/orders'], ['Wishlist', '/wishlist']] : []),
    ...(user?.role === 'seller' ? [['Seller', '/seller']] : []),
    ...(user?.role === 'admin' ? [['Admin Panel', '/admin/dashboard']] : [])
  ];
  const close = () => setOpen(false);
  return <header className="topbar">
    <div className="container nav">
      <div className="brand">
      <span className="brand-mark">
        <BookOpen size={20}/>
      </span>Bookestro</div>
      <nav className={`nav-links ${open ? 'open' : ''}`}>{links.map(([label, path]) =>      <NavLink key={path} to={path} onClick={close}>{label === 'Seller' && <Store size={16}/>} {label === 'Admin Panel' && <LayoutDashboard size={16}/>} {label === 'Wishlist' && <Heart size={15}/>} {label}</NavLink>)}
        </nav>
      <div className="nav-actions">{user?.role === 'customer' && 
        <Link className="icon-btn with-count" to="/wishlist" aria-label="Wishlist" onClick= {close}>
          <Heart size={18}/>
          <span>{wishlistCount}</span>
        </Link>}<label className="theme-toggle" title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}>
          <input
            type="checkbox"
            checked={theme === 'dark'}
            onChange={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          />
          <Sun className="theme-sun" size={19} aria-hidden="true" />
          <Moon className="theme-moon" size={19} aria-hidden="true" />
        </label><Link className="icon-btn with-count" to="/cart" aria-label="Cart" onClick={close}>
        <ShoppingCart size={19}/>
        <span>{cartCount}</span>
        </Link>{user ? <button className="user-chip" onClick={async () => { close(); await logout(); }}>
          <User size={17}/>
          <span>{user.name}</span>
          <LogOut size={15}/>
          </button> : 
          <Link className="btn btn-dark small" to="/login" onClick={close}>Login</Link>} <button className="menu-toggle" onClick={() => setOpen(v => !v)} aria-label="Toggle menu">{open ? 
          <X size={21}/> :
           <Menu size={21}/>}
           </button>
       </div>
    </div>
  </header>;
}
