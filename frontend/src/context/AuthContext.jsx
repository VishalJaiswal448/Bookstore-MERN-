import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const ensureCsrf = useCallback(async () => {
    await api.get('/auth/csrf');
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await ensureCsrf();
        const { data } = await api.get('/auth/me');
        if (active) setUser(data.user || null);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [ensureCsrf]);

  const login = async (email, password) => {
    await ensureCsrf();
    const { data } = await api.post('/auth/login', { email, password });
    setUser(data.user);
    return data.user;
  };

  const register = async payload => {
    await ensureCsrf();
    const { data } = await api.post('/auth/register', payload);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await ensureCsrf();
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  };

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
