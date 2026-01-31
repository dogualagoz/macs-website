/**
 * Main App component that serves as the root of the application.
 * Handles the overall layout and navigation state.
 */
import React, { useState, useEffect, useRef} from 'react';
import { Header, Footer } from './shared/components/layout';
import { HomePage } from './features/home';
import { EventsPage, EventDetailPage } from './features/events';
// Old project pages (commented out)
// import { ProjectsPage, ProjectDetailPage } from './features/projects';
// New project pages
import NewProjectsPage from './features/projects/pages/NewProjectsPage';
import NewProjectDetailPage from './features/projects/pages/NewProjectDetailPage';
import { SponsorsPage } from './features/sponsors';
import { AboutPage } from './features/about';
import ComingSoon from './shared/components/pages/ComingSoon';
import { LoginPage, ProtectedRoute, AuthProvider } from './features/auth';
import { AdminPanel } from './features/admin';
import Page404 from './shared/components/Page404';
import { Routes, Route, useLocation } from 'react-router-dom';
import './styles/App.css';
import ScrollToTop from './shared/components/navigation/ScrollToTop';

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
      <ScrollToTop />
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
            {/* NEW PROJECT PAGES */}
            <Route path="/projeler" element={<NewProjectsPage />} />
            <Route path="/projeler/:id" element={<NewProjectDetailPage />} />
            {/* Sponsorluklar geçici olarak ComingSoon sayfasına yönlendirildi. Sadece bu satırı değiştirerek eski haline dönebilir. */}
            <Route path="/sponsorluk" element={<SponsorsPage />} />
            <Route path="/hakkimizda" element={<AboutPage />} />
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