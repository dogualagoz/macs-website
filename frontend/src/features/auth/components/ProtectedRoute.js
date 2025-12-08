import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEV_BYPASS_AUTH = true;

const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  
  if (DEV_BYPASS_AUTH) {
    return <Outlet />;
  }
  
  if (loading) {
    return <div className="loading">Yükleniyor...</div>;
  }
  
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  
  return <Outlet />;
};

export default ProtectedRoute;
