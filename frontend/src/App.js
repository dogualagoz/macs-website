/**
 * Main App component that serves as the root of the application.
 * Handles the overall layout and navigation state.
 */
import React, { useState, useEffect, useRef} from 'react';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Events from './pages/Events';
import Projects from './pages/Projects';
import ProjectDetailPageV1 from './pages/macs_proje_detay_sayfasi_react_v_1';
import LoginPage from './pages/LoginPage';
import AdminPanel from './pages/AdminPanel';
import { Routes, Route, useLocation } from 'react-router-dom';
import EventDetailPage from './pages/EventDetailPage';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import './styles/App.css';
import Page404 from './pages/Page404';
import EventPageV2 from './pages/macs_etkinlik_sayfasi_react_v_2';

function App() {
  // State to track whether the page has been scrolled
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const { pathname, search } = location; 
  const firstRender = useRef(true);

  // Effect to handle scroll events and update header styling
  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      setIsScrolled(offset > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll for hash links with header offset
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        const headerHeight = 70;
        const top = el.getBoundingClientRect().top + window.pageYOffset - headerHeight;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    }
  }, [location]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false; // ilk render'ı atla (script zaten saydı)
      return;
    }
    if (typeof window !== "undefined" && typeof window.va === "function") {
      window.va("pageview", { path: pathname + search });
    }
  }, [pathname, search]);

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
            {/* Use V2 detail page */}
            <Route path="/etkinlikler/:slug" element={<EventPageV2 />} />
            <Route path="/projeler" element={<Projects />} />
            <Route path="/projeler/:slug" element={<ProjectDetailPageV1 />} />
            {/* Legacy kept if needed: <Route path="/etkinlikler/:slug" element={<EventDetailPage />} /> */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/admin/*" element={<AdminPanel />} />
            </Route>
            
            {/* 404 page */}
            <Route path="*" element={<Page404 />} />
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