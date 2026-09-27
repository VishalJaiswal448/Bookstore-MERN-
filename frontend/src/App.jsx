import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Books from './pages/Books';
import BookDetails from './pages/BookDetails';
import Cart from './pages/Cart';
import Auth from './pages/Auth';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import Wishlist from './pages/Wishlist';
import Seller from './pages/Seller';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';

export default function App() {
  return <div className="app-shell"><Header/><Routes>
    <Route path="/" element={<Home/>}/>
    <Route path="/books" element={<Books/>}/>
    <Route path="/books/:id" element={<BookDetails/>}/>
    <Route path="/cart" element={<Cart/>}/>
    <Route path="/login" element={<Auth mode="login"/>}/>
    <Route path="/register" element={<Auth mode="register"/>}/>
    <Route path="/checkout" element={<ProtectedRoute roles={['customer']}><Checkout/></ProtectedRoute>}/>
    <Route path="/orders" element={<ProtectedRoute roles={['customer']}><Orders/></ProtectedRoute>}/>
    <Route path="/wishlist" element={<ProtectedRoute roles={['customer']}><Wishlist/></ProtectedRoute>}/>
    <Route path="/seller" element={<ProtectedRoute roles={['seller']}><Seller/></ProtectedRoute>}/>
    <Route path="/seller/dashboard" element={<ProtectedRoute roles={['seller']}><Seller/></ProtectedRoute>}/>
    <Route path="/admin" element={<ProtectedRoute roles={['admin']}><Admin/></ProtectedRoute>}/>
    <Route path="/admin/dashboard" element={<ProtectedRoute roles={['admin']}><Admin/></ProtectedRoute>}/>
    <Route path="/dashboard" element={<ProtectedRoute roles={['admin']}><Admin/></ProtectedRoute>}/>
    <Route path="*" element={<NotFound/>}/>
  </Routes><Footer/></div>;
}
