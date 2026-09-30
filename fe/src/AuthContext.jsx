/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';

const TOKEN_KEY = 'token';
const AuthContext = createContext(null);

// Ghi nhớ đăng nhập -> localStorage (còn sau khi tắt trình duyệt)
// Không ghi nhớ    -> sessionStorage (mất khi đóng trình duyệt)
function readToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readToken);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api('/api/auth/me', { token })
      .then((data) => !cancelled && setUser(data.user))
      .catch(() => {
        if (cancelled) return;
        clearToken();
        setToken(null);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const saveSession = useCallback(({ token, user }, remember = true) => {
    clearToken();
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
    setUser(user);
    setToken(token);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, loading, saveSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
