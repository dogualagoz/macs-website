import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { mockSponsors } from '../data/mockSponsors';
import { sponsorService } from '../../../shared/services/api';
import { handleAvatarError } from '../../../utils/imageUtils';
import { responsiveImgProps, withVariantFallback } from '../../../shared/utils/responsiveImage';
import { GradientBackground } from '../../../shared/components/ui/GradientBackground';
import { ChevronDown } from 'lucide-react';
import '../../../styles/pages/sponsors.css';


import SEO from '../../../shared/components/seo/SEO';
import { USE_MOCK_FALLBACK } from '../../../shared/utils/mockFallback';

import { GridIcon, MapIcon, LocationIcon, DiscountIcon, GoogleMapsIcon, CloseIcon } from '../components/SponsorIcons';

const SponsorsMap = lazy(() => import('../components/SponsorsMap'));

// Harita kutusuyla ayni yukseklikte yer tutucu; chunk inerken sayfa ziplamaz.
const MapPlaceholder = () => (
  <div className="sponsors-map" aria-busy="true">
    <div className="sponsors-map__container" style={{ background: '#f3f4f6' }} />
  </div>
);

/* Harita (mapbox) yalnizca kutu ekrana 300px yaklasinca yuklenir. Sayfa
   acildiginda ustte FeaturedSplit oldugu icin harita cogu zaman ilk ekranda
   degil; boylece mapbox ilk yuklemeyi ve ana thread'i bloklamaz. */
function DeferredSponsorsMap({ sponsors }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(
    () => typeof window === 'undefined' || !('IntersectionObserver' in window)
  );

  useEffect(() => {
    if (visible || !ref.current) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px 0px' }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible]);

  // motion kok: AnimatePresence (grid/harita gecisi) cikis animasyonunu
  // dogrudan cocugunda arar.
  return (
    <m.div ref={ref} exit={{ opacity: 0 }}>
      {visible ? (
        <Suspense fallback={<MapPlaceholder />}>
          <SponsorsMap sponsors={sponsors} />
        </Suspense>
      ) : (
        <MapPlaceholder />
      )}
    </m.div>
  );
}

const transformSponsorData = (sponsor) => {
  const mapped = sponsorService._mapSponsor(sponsor);

  // Koordinatları güvenli bir şekilde sayıya çevir
  const lat = Number(sponsor.latitude || sponsor.location?.lat);
  const lng = Number(sponsor.longitude || sponsor.location?.lng);

  return {
    ...mapped,
    imageUrl: mapped.logo_url,
    location: {
      address: sponsor.address || sponsor.location?.address || '',
      // Eğer koordinatlar geçerli değilse null dön (Mapbox filtresi bunları ayıklayacak)
      lat: isNaN(lat) ? null : lat,
      lng: isNaN(lng) ? null : lng
    }
  };
};

export default function SponsorsPage() {
  const [loading, setLoading] = useState(true);
  const [sponsors, setSponsors] = useState([]);
  const [error, setError] = useState(null);
  const [selectedSponsor, setSelectedSponsor] = useState(null);
  const [activeView, setActiveView] = useState('map');

  useEffect(() => {
    const fetchSponsors = async () => {
      const startTime = Date.now();
      try {
        setLoading(true);
        const data = await sponsorService.getAll({ is_active: true });

        // Boş liste geçerli bir yanıt: boş durum ekranı gösterilir, örnek veri değil.
        setSponsors(Array.isArray(data) ? data.map(transformSponsorData) : []);
        setError(null);
      } catch (err) {
        console.error('Error fetching sponsors:', err);
        setError(err.message || 'Sponsorlar yüklenemedi');
        // Örnek veri yalnızca geliştirmede; production'da hata görünür kalmalı.
        setSponsors(USE_MOCK_FALLBACK ? mockSponsors.map(transformSponsorData) : []);
      } finally {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(400 - elapsedTime, 0);
        setTimeout(() => {
          setLoading(false);
        }, remainingTime);
      }
    };

    fetchSponsors();
  }, []);

  // SEO yükleme sırasında da basılır: başlık sayfa açılır açılmaz doğru olsun
  // (GA4 page_view veriyi beklemeden doğru başlıkla gider).
  const seo = (
    <SEO
      title="Sponsorlarımız"
      description="MACS topluluğunu destekleyen değerli sponsorlar ve iş ortakları. Eskişehir'deki teknoloji ekosisteminin güçlü paydaşları."
      keywords="MACS sponsorları, sponsor, iş ortağı, Eskişehir teknoloji, destek"
      url="https://macsclub.com.tr/sponsorluk"
    />
  );

  if (loading) {
    return (
      <>
      {seo}
      {/* key: yüklemeden içeriğe geçişte kap, önceki gibi yeniden mount olsun. */}
      <div key="loading" className="sponsors-page sponsors-page--split">
        <section
          className="sponsors-split"
          aria-busy="true"
          aria-label="Sponsorlar yükleniyor"
        >
          <div className="sponsors-split__bg" aria-hidden="true">
            <GradientBackground className="h-full w-full" />
          </div>
          <div className="sponsors-split__grid" style={{ '--split-count': 2 }}>
            <div className="split-panel">
              <span className="split-panel__plate split-panel__plate--loading" />
            </div>
            <div className="split-panel">
              <span className="split-panel__plate split-panel__plate--loading" />
            </div>
          </div>
        </section>
      </div>
      </>
    );
  }

  // İlk girişte tam ekran gösterilecek büyük sponsorlar.
  // Aynı sponsorlar aşağıdaki grid ve haritada da yer alır: öne çıkarma
  // bir rozet/etiket değil, yalnızca sayfa girişindeki sunum sırası.
  const featuredSponsors = sponsors.filter((s) => s.is_featured);
  const hasSplit = featuredSponsors.length > 0;

  return (
    <>
      {seo}
      <div className={`sponsors-page ${hasSplit ? 'sponsors-page--split' : ''}`}>
      {hasSplit ? (
        <FeaturedSplit sponsors={featuredSponsors} />
      ) : (
        <section className="sponsors-hero">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="sponsors-hero__content"
          >
            <h1 className="sponsors-hero__title">Sponsorlarımız</h1>
            <p className="sponsors-hero__subtitle">
              MACS Kulübü'nü destekleyen değerli kurumlar ve işletmeler
            </p>
          </m.div>
        </section>
      )}

      <div className="sponsors-main" id="sponsorlar-icerik">
        {error && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="sponsors-error"
          >
            <p className="sponsors-error__text">
              {USE_MOCK_FALLBACK
                ? 'Sponsorlar yüklenirken bir hata oluştu. Örnek veriler gösteriliyor.'
                : 'Sponsorlar şu an yüklenemedi. Lütfen biraz sonra tekrar deneyin.'}
            </p>
          </m.div>
        )}

        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="sponsors-view-toggle"
        >
          <div className="sponsors-view-toggle__buttons" role="tablist" aria-label="Görünüm seçenekleri">
            <button
              onClick={() => setActiveView('grid')}
              className={`sponsors-view-toggle__btn ${activeView === 'grid' ? 'sponsors-view-toggle__btn--active' : ''}`}
              role="tab"
              aria-selected={activeView === 'grid'}
              aria-controls="sponsors-content"
            >
              <GridIcon />
              Grid Görünüm
            </button>
            <button
              onClick={() => setActiveView('map')}
              className={`sponsors-view-toggle__btn ${activeView === 'map' ? 'sponsors-view-toggle__btn--active' : ''}`}
              role="tab"
              aria-selected={activeView === 'map'}
              aria-controls="sponsors-content"
            >
              <MapIcon />
              Harita Görünüm
            </button>
          </div>
        </m.div>

        {/* Content */}
        <div id="sponsors-content" role="tabpanel">
          <AnimatePresence mode="wait">
            {activeView === 'grid' ? (
              <SponsorsGrid
                key="grid"
                sponsors={sponsors}
                onSponsorClick={setSelectedSponsor}
              />
            ) : (
              <DeferredSponsorsMap
                key="map"
                sponsors={sponsors}
              />
            )}
          </AnimatePresence>
        </div>

        {sponsors.length === 0 && !loading && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="sponsors-empty"
          >
            <p className="sponsors-empty__text">Henüz sponsor bulunmamaktadır.</p>
          </m.div>
        )}
      </div>

      <section className="sponsors-cta">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="sponsors-cta__content"
        >
          <h2 className="sponsors-cta__title">Sponsor Olmak İster misiniz?</h2>
          <p className="sponsors-cta__desc">
            MACS Kulübü ile iş birliği yaparak Eskişehir'in teknoloji topluluğuna katkıda bulunun.
          </p>
          <a
            href="mailto:alagozdogu@gmail.com"
            className="sponsors-cta__btn"
          >
            İletişime Geçin
          </a>
        </m.div>
      </section>

      <AnimatePresence>
        {selectedSponsor && (
          <SponsorModal
            sponsor={selectedSponsor}
            onClose={() => setSelectedSponsor(null)}
          />
        )}
      </AnimatePresence>
      </div>
    </>
  );
}

function SponsorsGrid({ sponsors, onSponsorClick }) {
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="sponsors-grid"
    >
      {sponsors.map((sponsor, index) => (
        <m.div
          key={sponsor.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 * index }}
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSponsorClick(sponsor)}
          onKeyDown={(e) => e.key === 'Enter' && onSponsorClick(sponsor)}
          className="sponsor-card"
          role="button"
          tabIndex={0}
          aria-label={`${sponsor.name} sponsor detaylarını görüntüle`}
        >
          <div className="sponsor-card__header">
            <div className="sponsor-card__circle sponsor-card__circle--top" />
            <div className="sponsor-card__circle sponsor-card__circle--bottom" />

            {sponsor.category && (
              <span className="sponsor-card__category">
                {sponsor.category}
              </span>
            )}

            <div className="sponsor-card__avatar-wrapper">
              {sponsor.imageUrl ? (
                <img loading="lazy" decoding="async"
                  src={sponsor.imageUrl}
                  {...responsiveImgProps(sponsor.imageUrl, '64px')}
                  alt={sponsor.name}
                  className="sponsor-card__avatar"
                  onError={withVariantFallback((e) => handleAvatarError(e, sponsor.name))}
                />
              ) : (
                <div className="sponsor-card__avatar sponsor-card__avatar--placeholder">
                  {(sponsor.name || 'S').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          <div className="sponsor-card__body">
            <h3 className="sponsor-card__name">
              {sponsor.name}
            </h3>
            <p className="sponsor-card__desc">{sponsor.description}</p>

            {sponsor.discountInfo && (
              <div className="sponsor-card__discount">
                <div className="sponsor-card__discount-icon">
                  <DiscountIcon />
                </div>
                <p className="sponsor-card__discount-text">{sponsor.discountInfo}</p>
              </div>
            )}

            {sponsor.location?.address && (
              <div className="sponsor-card__location">
                <LocationIcon />
                <span>{sponsor.location.address}</span>
              </div>
            )}
          </div>
        </m.div>
      ))}
    </m.div>
  );
}

/**
 * FeaturedSplit — sayfa girişindeki tam ekran ikili panel.
 * İki büyük sponsor ekranı yarı yarıya paylaşır. Rozet/etiket yok:
 * ayrıcalık sadece sunum sırası, sponsorlar aşağıdaki listede de görünür.
 */
function FeaturedSplit({ sponsors }) {
  const sectionRef = useRef(null);

  // Panel ekrandayken header koyu temaya geçsin: beyaz yarı saydam bar
  // lacivert panelin üstünde açık bir şerit gibi duruyordu.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        document.body.classList.toggle('sponsors-split-visible', entry.intersectionRatio > 0.55);
      },
      { threshold: [0, 0.55, 1] }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      document.body.classList.remove('sponsors-split-visible');
    };
  }, []);

  const scrollToContent = () => {
    document.getElementById('sponsorlar-icerik')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section
      ref={sectionRef}
      className="sponsors-split"
      aria-labelledby="sponsorlar-baslik"
    >
      <div className="sponsors-split__bg" aria-hidden="true">
        <GradientBackground className="h-full w-full" />
      </div>

      <div className="sponsors-split__heading">
        <h1 id="sponsorlar-baslik" className="sponsors-split__title">Sponsorlarımız</h1>
        <p className="sponsors-split__subtitle">
          MACS Kulübü'nü destekleyen değerli kurumlar ve işletmeler
        </p>
      </div>

      <div
        className="sponsors-split__grid"
        style={{ '--split-count': Math.min(sponsors.length, 2) }}
      >
        {sponsors.map((sponsor, index) => (
          <m.div
            key={sponsor.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 + index * 0.1 }}
            className="split-panel"
          >
            <span className="split-panel__plate">
              {sponsor.imageUrl ? (
                <img fetchpriority="high" decoding="async"
                  src={sponsor.imageUrl}
                  {...responsiveImgProps(sponsor.imageUrl, '(min-width: 768px) 448px, 82vw')}
                  alt={sponsor.name}
                  className="split-panel__logo"
                  onError={withVariantFallback((e) => handleAvatarError(e, sponsor.name))}
                />
              ) : (
                <span className="split-panel__logo split-panel__logo--placeholder">
                  {(sponsor.name || 'S').charAt(0).toUpperCase()}
                </span>
              )}
            </span>
            <h2 className="split-panel__name">{sponsor.name}</h2>
            {sponsor.description && (
              <p className="split-panel__desc">{sponsor.description}</p>
            )}
          </m.div>
        ))}
      </div>

      <m.button
        type="button"
        onClick={scrollToContent}
        className="sponsors-split__cue"
        aria-label="Sponsor listesine kaydır"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <span className="sponsors-split__cue-text">Tüm sponsorlar</span>
        <span className="sponsors-split__cue-icon">
          <ChevronDown size={20} />
        </span>
      </m.button>
    </section>
  );
}

function SponsorModal({ sponsor, onClose }) {
  const googleMapsLink = sponsor.location?.lat && sponsor.location?.lng
    ? `https://www.google.com/maps?q=${sponsor.location.lat},${sponsor.location.lng}`
    : null;

  // Escape tuşu ile kapatma
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="sponsor-modal__overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sponsor-modal-title"
    >
      <m.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="sponsor-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sponsor-modal__header">
          <button
            onClick={onClose}
            className="sponsor-modal__close"
            aria-label="Modalı kapat"
          >
            <CloseIcon />
          </button>
          {sponsor.imageUrl ? (
            <img
              src={sponsor.imageUrl}
              alt={sponsor.name}
              className="sponsor-modal__avatar"
              onError={(e) => handleAvatarError(e, sponsor.name)}
            />
          ) : (
            <div className="sponsor-modal__avatar sponsor-modal__avatar--placeholder">
              {(sponsor.name || 'S').charAt(0)}
            </div>
          )}
          {sponsor.category && (
            <span className="sponsor-modal__category">
              {sponsor.category}
            </span>
          )}
        </div>

        <div className="sponsor-modal__body">
          <h2 id="sponsor-modal-title" className="sponsor-modal__name">{sponsor.name}</h2>
          {sponsor.description && (
            <p className="sponsor-modal__desc">{sponsor.description}</p>
          )}

          {sponsor.discountInfo && (
            <div className="sponsor-modal__discount">
              <p>{sponsor.discountInfo}</p>
            </div>
          )}

          {sponsor.location?.address && (
            <div className="sponsor-modal__location-wrapper">
              <div className="sponsor-modal__location">
                <LocationIcon />
                <span>{sponsor.location.address}</span>
              </div>
            </div>
          )}

          {googleMapsLink && (
            <a
              href={googleMapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="sponsor-modal__btn"
            >
              <GoogleMapsIcon />
              Haritalarda Aç
            </a>
          )}
        </div>
      </m.div>
    </m.div>
  );
}
