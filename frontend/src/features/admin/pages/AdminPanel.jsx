import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Admin sayfaları
import Dashboard from './Dashboard';
import Content from './Content';
import Users from './Users';
import Logs from './Logs';

// CSS stilleri
import '../../../styles/admin.css';
import '../../../styles/admin-reset.css';

/**
 * Admin Panel Ana Bileşeni
 * 
 * Bu bileşen, admin paneli için bir router görevi görür ve
 * kullanıcının yetkilendirmesini kontrol eder.
 */
const AdminPanel = () => {
  // Geliştirme amaçlı olarak her zaman admin olarak kabul et
  // Gerçek uygulamada bu kontrol aktif edilmelidir
  const isAdmin = true; // user?.role?.toLowerCase() === 'admin';
  
  // Kullanıcı admin değilse ana sayfaya yönlendir
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/content" element={<Content />} />
      <Route path="/users" element={<Users />} />
      <Route path="/logs" element={<Logs />} />
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
};

export default AdminPanel;
