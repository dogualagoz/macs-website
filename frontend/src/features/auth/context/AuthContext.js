import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { authService } from '../../../shared/services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const logoutTimerRef = useRef(null);

  const decodeJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) return null;
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (_e) {
      return null;
    }
  };

  const clearLogoutTimer = () => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  };

  const logout = useCallback(() => {
    clearLogoutTimer();
    localStorage.removeItem('token');
    localStorage.removeItem('token_exp');
    setUser(null);
  }, []);

  const scheduleAutoLogout = useCallback((token) => {
    clearLogoutTimer();
    const payload = decodeJwt(token);
    const expSeconds = payload?.exp;
    if (!expSeconds) return;
    const expMs = expSeconds * 1000;
    const delay = expMs - Date.now();
    localStorage.setItem('token_exp', String(expMs));
    if (delay <= 0) {
      logout();
      return;
    }
    logoutTimerRef.current = setTimeout(() => {
      logout();
      try {
        if (window.location.pathname.startsWith('/admin')) {
          window.location.href = '/login?expired=1';
        }
      } catch (_e) {}
    }, Math.min(delay, 2 ** 31 - 1));
  }, [logout]);

  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setLoading(false);
        return;
      }
      const payload = decodeJwt(token);
      const exp = payload?.exp ? payload.exp * 1000 : Number(localStorage.getItem('token_exp')) || null;
      if (exp && exp <= Date.now()) {
        localStorage.removeItem('token');
        localStorage.removeItem('token_exp');
        setLoading(false);
        return;
      }

      try {
        const userData = await authService.getCurrentUser(token).catch(() => null);
        
        if (userData) {
          setUser({
            ...userData,
            isAuthenticated: true,
            token
          });
        } else {
          setUser({
            isAuthenticated: true,
            token
          });
        }
        scheduleAutoLogout(token);
      } catch (err) {
        console.error('Authentication error:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('token_exp');
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, [scheduleAutoLogout]);

  const login = async (email, password) => {
    setError(null);
    
    try {
      const data = await authService.login(email, password);
      const { access_token } = data;

      localStorage.setItem('token', access_token);

      setUser({
        isAuthenticated: true,
        token: access_token
      });

      scheduleAutoLogout(access_token);

      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const isAuthenticated = () => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    const expMs = Number(localStorage.getItem('token_exp')) || (decodeJwt(token)?.exp ? decodeJwt(token).exp * 1000 : null);
    if (expMs && expMs <= Date.now()) {
      localStorage.removeItem('token');
      localStorage.removeItem('token_exp');
      return false;
    }
    return true;
  };

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated,
    getAuthHeader
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
