import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';

// Admin sayfaları
import Dashboard from './Dashboard';
import Content from './Content';
import Users from './Users';
import Members from './Members';

// CSS stilleri
import '../../../styles/admin.css';
import '../../../styles/admin-reset.css';

/**
 * Admin Panel router'ı.
 *
 * Kimlik doğrulamayı ProtectedRoute yapıyor; burada rol bazlı görünürlük var.
 * İçerik ve üye yönetimi admin + moderator'a açık, kullanıcı yönetimi yalnızca
 * admin'e (backend'deki requireRoles matrisiyle aynı). Asıl yetki kontrolü
 * backend'de; bu katman moderator'ın 403 dönen sayfalara düşmesini engelliyor.
 */
const AdminPanel = () => {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/content" element={<Content />} />
      <Route
        path="/users"
        element={isAdmin ? <Users /> : <Navigate to="/admin/dashboard" replace />}
      />
      <Route path="/members" element={<Members />} />
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
};

export default AdminPanel;
