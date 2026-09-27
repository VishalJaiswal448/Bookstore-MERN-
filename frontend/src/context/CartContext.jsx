import React, { createContext, useContext, useMemo, useState } from 'react';

const CartContext = createContext(null);

function readInitialCart() {
  try {
    const raw = localStorage.getItem('bb_cart');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem('bb_cart');
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readInitialCart);
  const save = next => {
    setItems(next);
    localStorage.setItem('bb_cart', JSON.stringify(next));
  };
  const add = book => {
    if (!book?.stock) return;
    const found = items.find(i => i._id === book._id);
    save(found
      ? items.map(i => i._id === book._id ? { ...i, quantity: Math.min(Number(book.stock || 20), i.quantity + 1) } : i)
      : [...items, { ...book, quantity: 1 }]);
  };
  const remove = id => save(items.filter(i => i._id !== id));
  const setQty = (id, quantity) => save(items.map(i => i._id === id ? { ...i, quantity: Math.max(1, Math.min(Number(i.stock || 20), Number(quantity) || 1)) } : i));
  const clear = () => save([]);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const value = useMemo(() => ({ items, add, remove, setQty, clear, count, total }), [items, count, total]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
