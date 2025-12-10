/**
 * Main App component that serves as the root of the application.
 * Handles the overall layout and navigation state.
 */
import React, { useState, useEffect, useRef} from 'react';
import { Header, Footer } from './shared/components/layout';
import { HomePage } from './features/home';
import { EventsPage, EventDetailPage } from './features/events';
import { ProjectsPage, ProjectDetailPage } from './features/projects';
import { SponsorsPage } from './features/sponsors';
import ComingSoon from './shared/components/pages/ComingSoon';
import { LoginPage, ProtectedRoute, AuthProvider } from './features/auth';
import { AdminPanel } from './features/admin';
import Page404 from './shared/components/Page404';
import { Routes, Route, useLocation } from 'react-router-dom';
import './styles/App.css';

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
            <Route path="/" element={<HomePage />} />
            <Route path="/etkinlikler" element={<EventsPage />} />
            <Route path="/etkinlikler/:slug" element={<EventDetailPage />} />
            <Route path="/projeler" element={<ProjectsPage />} />
            <Route path="/projeler/:slug" element={<ProjectDetailPage />} />
            {/* Sponsorluklar geçici olarak ComingSoon sayfasına yönlendirildi. Sadece bu satırı değiştirerek eski haline dönebilir. */}
            <Route path="/sponsorluk" element={<ComingSoon />} />
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