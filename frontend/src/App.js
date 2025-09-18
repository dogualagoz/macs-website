/**
 * Main App component that serves as the root of the application.
 * Handles the overall layout and navigation state.
 */
import React, { useState, useEffect } from 'react';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Events from './pages/Events';
import Projects from './pages/Projects';
import ProjectDetailPage from './pages/ProjectDetailPage';
import LoginPage from './pages/LoginPage';
import AdminPanel from './pages/AdminPanel';
import { Routes, Route } from 'react-router-dom';
import EventDetailPage from './pages/EventDetailPage';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import './styles/App.css';
import Page404 from './pages/Page404';

function App() {
  // State to track whether the page has been scrolled
  const [isScrolled, setIsScrolled] = useState(false);

  // Effect to handle scroll events and update header styling
  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      setIsScrolled(offset > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AuthProvider>
      <div className="app">
        {/* Header'ı sadece admin ve login sayfalarında gösterme */}
        <Routes>
          <Route path="/login" element={null} />
          <Route path="/admin/*" element={null} />
          <Route path="*" element={<Header isScrolled={isScrolled} />} />
        </Routes>

        <main>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/etkinlikler" element={<Events />} />
            <Route path="/projeler" element={<Projects />} />
            <Route path="/projeler/:slug" element={<ProjectDetailPage />} />
            <Route path="/etkinlikler/:slug" element={<EventDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            
            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/admin/*" element={<AdminPanel />} />
            </Route>
          </Routes>
        </main>

        {/* Admin route'larında footer gösterme */}
        <Routes>
          <Route path="/admin/*" element={null} />
          <Route path="/login" element={null} />
          <Route path="*" element={<Footer />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;