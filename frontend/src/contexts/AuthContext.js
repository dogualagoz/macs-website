import React, { createContext, useState, useContext, useEffect } from 'react';
import * as authAPI from '../api/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is authenticated on initial load
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
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
      } catch (err) {
        console.error('Authentication error:', err);
        localStorage.removeItem('token');
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

      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!user?.isAuthenticated;
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
