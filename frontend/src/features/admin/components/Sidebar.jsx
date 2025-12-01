import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';

/**
 * Admin paneli için sidebar bileşeni
 * Tüm admin sayfalarında ortak olarak kullanılır
 */
const Sidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleExit = () => {
    logout();
    navigate('/');
  };

  return (
    <aside className="admin-sidebar">
      <h1>Admin Panel</h1>
      
      <nav className="admin-nav">
        <NavLink 
          to="/admin/dashboard" 
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
        >
          Dashboard
        </NavLink>
        
        <NavLink 
          to="/admin/content" 
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
        >
          İçerik Ekle
        </NavLink>
        
        <NavLink 
          to="/admin/users" 
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
        >
          Kullanıcılar
        </NavLink>
        
        <NavLink 
          to="/admin/logs" 
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
        >
          Loglar
        </NavLink>
      </nav>
      
      <div style={{ marginTop: 'auto', marginBottom: '2rem' }}>
        <button
          onClick={handleExit}
          className="exit-btn"
        >
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
