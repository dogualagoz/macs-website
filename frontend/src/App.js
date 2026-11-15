/**
 * Main App component that serves as the root of the application.
 * Handles the overall layout and navigation state.
 */
import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Header, Footer } from './shared/components/layout';
import { HomePage } from './features/home';
import ProtectedRoute from './features/auth/components/ProtectedRoute';
import { AuthProvider } from './features/auth/context/AuthContext';
import Loading from './shared/components/feedback/Loading';
// Admin CSS bilerek statik: admin-reset.css bugün tüm siteye uygulanıyor
// (sayfa <body>'de kayıyor). Panel JS'i lazy yüklenirken CSS de chunk'a
// taşınsaydı public sayfaların görünümü ve scroll davranışı değişirdi.
// Scope'lamak ayrı bir iş; görsel karşılaştırmayla yapılmalı.
import './styles/admin.css';
import './styles/admin-reset.css';
import Page404 from './shared/components/Page404';
import ErrorBoundary from './shared/components/feedback/ErrorBoundary';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LazyMotion, domAnimation } from 'framer-motion';
import './styles/App.css';
import ScrollToTop from './shared/components/navigation/ScrollToTop';

// Ana sayfa dışındaki sayfalar ayrı chunk: ziyaretçi yalnızca açtığı sayfanın
// kodunu indirir. Özellikle Sponsorluk: react-map-gl modül yüklenirken
// import('mapbox-gl') başlatıyor (~270 KB gzip); statik import'ta bu her
// sayfada iniyordu. Barrel (features/x/index.js) yerine doğrudan dosya
// import ediliyor, yoksa barrel'daki diğer export'lar ana bundle'a çekilir.
const EventsPage = lazy(() => import('./features/events/pages/EventsPage'));
const EventDetailPage = lazy(() => import('./features/events/pages/EventDetailPage'));
const ProjectsPage = lazy(() => import('./features/projects/pages/NewProjectsPage'));
const ProjectDetailPage = lazy(() => import('./features/projects/pages/NewProjectDetailPage'));
const SponsorsPage = lazy(() => import('./features/sponsors/pages/SponsorsPage'));
const AboutPage = lazy(() => import('./features/about/pages/AboutPage'));
const TeamPage = lazy(() => import('./features/team/pages/TeamPage'));
const LoginPage = lazy(() => import('./features/auth/pages/LoginPage'));
// Panel kodu ziyaretçilere gönderilmesin: yalnızca /admin açılınca yüklenir.
const AdminPanel = lazy(() => import('./features/admin/pages/AdminPanel'));

// Sayfa chunk'ı inerken footer yukarı zıplamasın diye ekran yüksekliği tutulur.
const PageFallback = () => <div style={{ minHeight: '100vh' }} aria-busy="true" />;

// Bilesenler `motion.x` yerine `m.x` kullanir; ozellik seti burada bir kez
// verilir (domAnimation: animasyon, varyant, exit, hover/tap, inView).
// Senkron: ozellikler lazy yuklendiginde, ozellikler gelmeden mount olan ic ice
// whileInView bolumleri (Hakkimizda > Degerlerimiz) hic tetiklenmiyordu.
// strict: yanlislikla `motion` kullanilirsa hata verir.

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
    <LazyMotion features={domAnimation} strict>
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
          <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/etkinlikler" element={<EventsPage />} />
            <Route path="/etkinlikler/:slug" element={<EventDetailPage />} />
            <Route path="/projeler" element={<ProjectsPage />} />
            <Route path="/projeler/:id" element={<ProjectDetailPage />} />
            <Route path="/sponsorluk" element={<SponsorsPage />} />
            <Route path="/qr" element={<Navigate to="/sponsorluk" replace />} />
            <Route path="/hakkimizda" element={<AboutPage />} />
            <Route path="/ekibimiz" element={<TeamPage />} />
            <Route path="/login" element={<LoginPage />} />
            
            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route
                path="/admin/*"
                element={(
                  <Suspense fallback={<Loading />}>
                    <AdminPanel />
                  </Suspense>
                )}
              />
            </Route>
            
            {/* 404 page */}
            <Route path="*" element={<Page404 />} />
          </Routes>
          </Suspense>
          </ErrorBoundary>
        </main>

        {/* Admin route'larında footer gösterme */}
        <Routes>
          <Route path="/admin/*" element={null} />
          <Route path="/login" element={null} />
          <Route path="/projeler/*" element={<Footer variant="projects" />} />
          <Route path="*" element={<Footer />} />
        </Routes>
      </div>
    </AuthProvider>
    </LazyMotion>
  );
}

export default App;
