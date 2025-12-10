import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl';
import { mockSponsors, eskisehirCenter } from '../data/mockSponsors';
import { sponsorService } from '../../../shared/services/api';
import env from '../../../shared/config/env';
import 'mapbox-gl/dist/mapbox-gl.css';
import '../../../styles/pages/sponsors.css';

const MAPBOX_TOKEN = env.mapboxToken;

// Backend URL'den /api kısmını çıkar ve image URL ile birleştir
const getImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  // Eğer zaten tam URL ise direkt döndür
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  // Backend base URL'ini al (API URL'den /api kısmını çıkar)
  const apiUrl = env.apiUrl || 'http://localhost:8000';
  const baseUrl = apiUrl.replace(/\/api$/, '');
  return `${baseUrl}${imageUrl}`;
};

const transformSponsorData = (sponsor) => ({
  id: sponsor.id,
  name: sponsor.name,
  description: sponsor.description || '',
  category: sponsor.category,
  discountInfo: sponsor.discount_info,
  imageUrl: getImageUrl(sponsor.image_url),
  location: {
    address: sponsor.address || '',
    lat: sponsor.latitude,
    lng: sponsor.longitude
  }
});

export default function SponsorsPage() {
  const [loading, setLoading] = useState(true);
  const [sponsors, setSponsors] = useState([]);
  const [error, setError] = useState(null);
  const [selectedSponsor, setSelectedSponsor] = useState(null);
  const [activeView, setActiveView] = useState('grid');

  useEffect(() => {
    const fetchSponsors = async () => {
      try {
        setLoading(true);
        const data = await sponsorService.getAll({ is_active: true });
        
        if (data && data.length > 0) {
          // Backend'den gelen veriyi dönüştür
          const transformedData = data.map(transformSponsorData);
          setSponsors(transformedData);
        } else {
          // Veri yoksa mock data kullan
          console.log('No sponsors from API, using mock data');
          setSponsors(mockSponsors);
        }
      } catch (err) {
        console.error('Error fetching sponsors:', err);
        setError(err.message);
        // API hatası durumunda mock data kullan
        setSponsors(mockSponsors);
      } finally {
        setLoading(false);
      }
    };

    fetchSponsors();
  }, []);

  if (loading) {
    return (
      <div className="sponsors-loading">
        <div className="sponsors-loading__content">
          <div className="sponsors-loading__spinner"></div>
          <p className="sponsors-loading__text">Sponsorlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sponsors-page">
      <section className="sponsors-hero">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="sponsors-hero__content"
        >
          <h1 className="sponsors-hero__title">Sponsorlarımız</h1>
          <p className="sponsors-hero__subtitle">
            MACS Kulübü'nü destekleyen değerli kurumlar ve işletmeler
          </p>
        </motion.div>
      </section>

      <div className="sponsors-main">
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="sponsors-error"
          >
            <p className="sponsors-error__text">
              Sponsorlar yüklenirken bir hata oluştu. Örnek veriler gösteriliyor.
            </p>
          </motion.div>
        )}

        <motion.div 
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
        </motion.div>

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
              <SponsorsMap 
                key="map"
                sponsors={sponsors}
              />
            )}
          </AnimatePresence>
        </div>

        {sponsors.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="sponsors-empty"
          >
            <p className="sponsors-empty__text">Henüz sponsor bulunmamaktadır.</p>
          </motion.div>
        )}
      </div>

      <section className="sponsors-cta">
        <motion.div
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
            href="mailto:mathandcomputersociety@gmail.com" 
            className="sponsors-cta__btn"
          >
            İletişime Geçin
          </a>
        </motion.div>
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
  );
}

function SponsorsGrid({ sponsors, onSponsorClick }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="sponsors-grid"
    >
      {sponsors.map((sponsor, index) => (
        <motion.div
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
                <img 
                  src={sponsor.imageUrl} 
                  alt={sponsor.name}
                  className="sponsor-card__avatar"
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
        </motion.div>
      ))}
    </motion.div>
  );
}

function SponsorsMap({ sponsors }) {
  const [popupInfo, setPopupInfo] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const [viewState, setViewState] = useState({
    longitude: eskisehirCenter.lng,
    latitude: eskisehirCenter.lat,
    zoom: 12
  });

  const handleClosePopup = () => {
    if (popupInfo && !isClosing) {
      setIsClosing(true);
      setTimeout(() => {
        setPopupInfo(null);
        setIsClosing(false);
      }, 200); // Animasyon süresiyle eşleşmeli
    }
  };

  const handleMarkerClick = (sponsor, e) => {
    e.originalEvent.stopPropagation();
    if (popupInfo?.id === sponsor.id) {
      handleClosePopup();
    } else {
      setIsClosing(false);
      setPopupInfo(sponsor);
    }
  };

  const handleSidebarClick = (sponsor) => {
    setIsClosing(false);
    setPopupInfo(sponsor);
    if (sponsor.location?.lng && sponsor.location?.lat) {
      setViewState(prev => ({
        ...prev,
        longitude: sponsor.location.lng,
        latitude: sponsor.location.lat,
        zoom: 14
      }));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="sponsors-map"
    >
      <div className="sponsors-map__container">
        <Map
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={MAPBOX_TOKEN}
          onClick={handleClosePopup}
          reuseMaps
        >
          <NavigationControl position="top-right" />
          
          {sponsors.filter(s => s.location?.lat && s.location?.lng).map((sponsor) => (
            <Marker
              key={sponsor.id}
              longitude={sponsor.location.lng}
              latitude={sponsor.location.lat}
              anchor="bottom"
              onClick={(e) => handleMarkerClick(sponsor, e)}
            >
              <div 
                className={`sponsors-map__marker ${popupInfo?.id === sponsor.id ? 'sponsors-map__marker--active' : ''}`}
                role="button"
                aria-label={`${sponsor.name} konumunu göster`}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleMarkerClick(sponsor, e)}
              >
                {sponsor.imageUrl ? (
                  <img 
                    src={sponsor.imageUrl} 
                    alt={sponsor.name}
                    className="sponsors-map__marker-image"
                  />
                ) : (
                  (sponsor.name || 'S').charAt(0)
                )}
              </div>
            </Marker>
          ))}

          {popupInfo && popupInfo.location?.lat && popupInfo.location?.lng && (
            <Popup
              anchor="top"
              longitude={popupInfo.location.lng}
              latitude={popupInfo.location.lat}
              onClose={handleClosePopup}
              closeButton={false}
              closeOnClick={false}
              className={`sponsor-popup ${isClosing ? 'popup-closing' : ''}`}
              maxWidth="300px"
              offset={15}
            >
              <div className="sponsor-popup__content">
                  <div className="sponsor-popup__header">
                    {popupInfo.imageUrl ? (
                      <img 
                        src={popupInfo.imageUrl} 
                        alt={popupInfo.name}
                        className="sponsor-popup__avatar"
                      />
                    ) : (
                      <div className="sponsor-popup__avatar sponsor-popup__avatar--placeholder">
                        {popupInfo.name.charAt(0)}
                      </div>
                    )}
                    <div className="sponsor-popup__info">
                      <h4 className="sponsor-popup__name">{popupInfo.name}</h4>
                      {popupInfo.category && (
                        <span className="sponsor-popup__category">
                          {popupInfo.category}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {popupInfo.discountInfo && (
                    <div className="sponsor-popup__discount">
                      <p>{popupInfo.discountInfo}</p>
                    </div>
                  )}
                  
                  {popupInfo.location?.address && (
                    <p className="sponsor-popup__location">
                      <LocationIcon />
                      {popupInfo.location.address}
                    </p>
                  )}
                  
                  {popupInfo.location?.lat && popupInfo.location?.lng && (
                    <a 
                      href={`https://www.google.com/maps?q=${popupInfo.location.lat},${popupInfo.location.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sponsor-popup__btn"
                    >
                      <GoogleMapsIcon />
                      Haritalarda Aç
                    </a>
                  )}
                </div>
              </Popup>
            )}
        </Map>
      </div>

      <div className="sponsors-sidebar">
        <div className="sponsors-sidebar__header">
          <h4 className="sponsors-sidebar__title">Sponsorlar</h4>
          <p className="sponsors-sidebar__count">{sponsors.length} sponsor</p>
        </div>
        <div className="sponsors-sidebar__list">
          {sponsors.map((sponsor) => (
            <motion.div
              key={sponsor.id}
              onClick={() => handleSidebarClick(sponsor)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`sponsors-sidebar__item ${popupInfo?.id === sponsor.id ? 'sponsors-sidebar__item--active' : ''}`}
            >
              <div className="sponsors-sidebar__item-content">
                <div className={`sponsors-sidebar__item-avatar ${popupInfo?.id === sponsor.id ? 'sponsors-sidebar__item-avatar--active' : ''}`}>
                  {sponsor.imageUrl ? (
                    <img 
                      src={sponsor.imageUrl} 
                      alt={sponsor.name}
                      className="sponsors-sidebar__item-avatar-image"
                    />
                  ) : (
                    (sponsor.name || 'S').charAt(0)
                  )}
                </div>
                <div className="sponsors-sidebar__item-info">
                  <p className="sponsors-sidebar__item-name">
                    {sponsor.name}
                  </p>
                  {sponsor.location?.address && (
                    <p className="sponsors-sidebar__item-address">
                      {sponsor.location.address}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="sponsor-modal__overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sponsor-modal-title"
    >
      <motion.div
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
      </motion.div>
    </motion.div>
  );
}

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function DiscountIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="flex-shrink-0">
      <path d="M9 9h.01M15 15h.01M16 8l-8 8" />
      <circle cx="9" cy="9" r="1" fill="white" />
      <circle cx="15" cy="15" r="1" fill="white" />
    </svg>
  );
}

function GoogleMapsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
