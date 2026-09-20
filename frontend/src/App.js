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
import { AboutPage } from './features/about';
import { TeamPage } from './features/team';
import { LoginPage, ProtectedRoute, AuthProvider } from './features/auth';
import { AdminPanel } from './features/admin';
import Page404 from './shared/components/Page404';
import ErrorBoundary from './shared/components/feedback/ErrorBoundary';
import { Routes, Route, useLocation } from 'react-router-dom';
import './styles/App.css';
import ScrollToTop from './shared/components/navigation/ScrollToTop';

function App() {
  // State to track whether the page has been scrolled
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const { pathname, search } = location; 
  const firstRender = useRef(true);

  // Header stilini kaydırma durumuna göre güncelle (scroll'da "dynamic island").
  //
  // Sentinel'li IntersectionObserver kullanılamıyor: admin-reset.css'teki
  // `html, body { height: 100%; overflow: auto }` kuralı AdminPanel import'u
  // üzerinden tüm bundle'a sızıyor, bu yüzden sayfa window'da değil <body>
  // elemanında kayıyor. Viewport'a sabitlenmiş sentinel hiç ekrandan çıkmıyor,
  // observer da hiç tetiklenmiyordu. Hangi eleman kayarsa kaysın çalışsın diye
  // scroll konumu üç adaydan en büyüğü olarak okunuyor.
  //
  // Maliyet kontrolü: listener passive + rAF ile kısılıyor, state sadece eşik
  // geçildiğinde değişiyor; kare başına setState yok.
  useEffect(() => {
    const THRESHOLD = 50;
    let frame = 0;

    const read = () => {
      frame = 0;
      const top = Math.max(
        window.scrollY || 0,
        document.documentElement.scrollTop || 0,
        document.body.scrollTop || 0
      );
      const next = top > THRESHOLD;
      setIsScrolled(prev => (prev === next ? prev : next));
    };

    const onScroll = () => {
      if (!frame) {
        frame = requestAnimationFrame(read);
      }
    };

    read();
    // capture: scroll event'i bubble etmez; body kaydığında da yakalamak için.
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', onScroll);
      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
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
          {/* key={pathname}: bir sayfa çökerse başka bir sayfaya gidildiğinde
              boundary sıfırlansın, kullanıcı hata ekranında sıkışmasın. */}
          <ErrorBoundary key={pathname}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/etkinlikler" element={<EventsPage />} />
            <Route path="/etkinlikler/:slug" element={<EventDetailPage />} />
            <Route path="/projeler" element={<ProjectsPage />} />
            <Route path="/projeler/:id" element={<ProjectDetailPage />} />
            {/* Sponsorluklar geçici olarak ComingSoon sayfasına yönlendirildi. Sadece bu satırı değiştirerek eski haline dönebilir. */}
            <Route path="/sponsorluk" element={<SponsorsPage />} />
            <Route path="/hakkimizda" element={<AboutPage />} />
            <Route path="/ekibimiz" element={<TeamPage />} />
            <Route path="/login" element={<LoginPage />} />
            
            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/admin/*" element={<AdminPanel />} />
            </Route>
            
            {/* 404 page */}
            <Route path="*" element={<Page404 />} />
          </Routes>
          </ErrorBoundary>
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