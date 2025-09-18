import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import * as authAPI from '../api/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const logoutTimerRef = useRef(null);

  // Decode JWT (base64url) and return payload or null
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

  const scheduleAutoLogout = (token) => {
    clearLogoutTimer();
    const payload = decodeJwt(token);
    const expSeconds = payload?.exp; // seconds since epoch
    if (!expSeconds) return;
    const expMs = expSeconds * 1000;
    const delay = expMs - Date.now();
    // Persist for reloads
    localStorage.setItem('token_exp', String(expMs));
    if (delay <= 0) {
      // already expired
      logout();
      return;
    }
    logoutTimerRef.current = setTimeout(() => {
      logout();
      // Opsiyonel: login sayfasına yönlendirme
      try {
        if (window.location.pathname.startsWith('/admin')) {
          window.location.href = '/login?expired=1';
        }
      } catch (_e) {}
    }, Math.min(delay, 2 ** 31 - 1)); // setTimeout sınırı guard
  };

  // Check if user is authenticated on initial load
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setLoading(false);
        return;
      }
      // Token süresi kontrolü (exp)
      const payload = decodeJwt(token);
      const exp = payload?.exp ? payload.exp * 1000 : Number(localStorage.getItem('token_exp')) || null;
      if (exp && exp <= Date.now()) {
        localStorage.removeItem('token');
        localStorage.removeItem('token_exp');
        setLoading(false);
        return;
      }

      try {
        // Try to get user info with token
        const userData = await authAPI.getCurrentUser(token).catch(() => null);
        
        if (userData) {
          setUser({
            ...userData,
            isAuthenticated: true,
            token
          });
        } else {
          // If we can't get user info, just set basic auth state
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
  }, []);

  // Login function
  const login = async (email, password) => {
    setError(null);
    
    try {
      const data = await authAPI.login(email, password);
      const { access_token } = data;

      // Save token to localStorage
      localStorage.setItem('token', access_token);

      // Update user state
      setUser({
        isAuthenticated: true,
        token: access_token
      });

      // Schedule auto logout based on token exp
      scheduleAutoLogout(access_token);

      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  // Logout function
  const logout = () => {
    clearLogoutTimer();
    localStorage.removeItem('token');
    localStorage.removeItem('token_exp');
    setUser(null);
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    const expMs = Number(localStorage.getItem('token_exp')) || (decodeJwt(token)?.exp ? decodeJwt(token).exp * 1000 : null);
    if (expMs && expMs <= Date.now()) {
      // Expired: temizle
      localStorage.removeItem('token');
      localStorage.removeItem('token_exp');
      return false;
    }
    return true;
  };

  // Get auth header for API requests
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
