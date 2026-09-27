import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user || user.role !== 'customer') { setItems([]); return; }
    setLoading(true);
    try {
      const { data } = await api.get('/wishlist');
      setItems(Array.isArray(data) ? data.filter(Boolean) : []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!user || user.role !== 'customer') { if (active) setItems([]); return; }
      if (active) setLoading(true);
      try {
        const { data } = await api.get('/wishlist');
        if (active) setItems(Array.isArray(data) ? data.filter(Boolean) : []);
      } catch { if (active) setItems([]); }
      finally { if (active) setLoading(false); }
    };
    run();
    return () => { active = false; };
  }, [user]);

  const has = useCallback((bookId) => items.some(item => String(item._id) === String(bookId)), [items]);
  const toggle = useCallback(async (book) => {
    if (!user || user.role !== 'customer') throw new Error('Please sign in as a customer to use the wishlist.');
    if (has(book._id)) {
      await api.delete(`/wishlist/${book._id}`);
      setItems(current => current.filter(item => String(item._id) !== String(book._id)));
      return false;
    }
    await api.post(`/wishlist/${book._id}`);
    setItems(current => current.some(item => String(item._id) === String(book._id)) ? current : [...current, book]);
    return true;
  }, [has, user]);

  const remove = useCallback(async (bookId) => {
    await api.delete(`/wishlist/${bookId}`);
    setItems(current => current.filter(item => String(item._id) !== String(bookId)));
  }, []);

  const value = useMemo(() => ({ items, count: items.length, loading, load, has, toggle, remove }), [items, loading, load, has, toggle, remove]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export const useWishlist = () => useContext(WishlistContext);
