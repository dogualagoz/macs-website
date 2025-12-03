import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl';
import { mockSponsors, eskisehirCenter } from '../data/mockSponsors';
import 'mapbox-gl/dist/mapbox-gl.css';
import '../../../styles/pages/sponsors.css';

//! DEV İÇİN ŞİMDİLİK BÖYLE
//! mapbox token silindi

export default function SponsorsPage() {
  const [loading, setLoading] = useState(true);
  const [selectedSponsor, setSelectedSponsor] = useState(null);
  const [activeView, setActiveView] = useState('grid');

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="sponsors-loading">
        <div className="loader-spinner"></div>
        <p>Sponsorlar yükleniyor...</p>
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
          className="sponsors-hero-content"
        >
          <h1>Sponsorlarımız</h1>
          <p>
            MACS Kulübü'nü destekleyen değerli kurumlar ve işletmeler. 
          </p>
        </motion.div>
      </section>

      <div className="sponsors-controls">
        <div className="view-toggle">
          <button 
            className={`toggle-btn ${activeView === 'map' ? 'active' : ''}`}
            onClick={() => setActiveView(activeView === 'grid' ? 'map' : 'grid')}
          >
            {activeView === 'grid' ? <MapIcon /> : <GridIcon />}
            {activeView === 'grid' ? 'Harita Görünüm' : 'Grid Görünüm'}
          </button>
        </div>
      </div>

      <div className="sponsors-content">
        <AnimatePresence mode="popLayout" initial={false}>
          {activeView === 'grid' ? (
            <SponsorsGrid 
              sponsors={mockSponsors} 
              onSponsorClick={setSelectedSponsor}
            />
          ) : (
            <SponsorsMap 
              sponsors={mockSponsors}
              selectedSponsor={selectedSponsor}
              onSponsorClick={setSelectedSponsor}
            />
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectedSponsor && (
          <SponsorModal 
            sponsor={selectedSponsor} 
            onClose={() => setSelectedSponsor(null)} 
          />
        )}
      </AnimatePresence>

      <section className="sponsors-cta">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="cta-content"
        >
          <h2>Sponsor Olmak İster misiniz?</h2>
          <p>
            MACS Kulübü ile iş birliği yaparak Eskişehir'in teknoloji topluluğuna katkıda bulunun.
          </p>
          <a href="mailto:mathandcomputersociety@gmail.com" className="cta-button">
            İletişime Geçin
          </a>
        </motion.div>
      </section>
    </div>
  );
}

//* grid view comp *//
function SponsorsGrid({ sponsors, onSponsorClick }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  return (
    <motion.div
      key="grid"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="sponsors-grid"
    >
      {sponsors.map((sponsor) => (
        <motion.div
          key={sponsor.id}
          variants={itemVariants}
          className="sponsor-card"
          onClick={() => onSponsorClick(sponsor)}
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
        >
          <div className="sponsor-logo">
            <div className="logo-placeholder">
              {sponsor.name.charAt(0)}
            </div>
          </div>
          <h3>{sponsor.name}</h3>
          <p>{sponsor.description}</p>
          <div className="sponsor-location">
            <LocationIcon />
            <span>{sponsor.location.address}</span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

//* map view comp *//
function SponsorsMap({ sponsors, selectedSponsor, onSponsorClick }) {
  const [popupInfo, setPopupInfo] = useState(null);
  const [viewState, setViewState] = useState({
    longitude: eskisehirCenter.lng,
    latitude: eskisehirCenter.lat,
    zoom: 12
  });

  const markers = sponsors.map((sponsor) => (
    <Marker
      key={sponsor.id}
      longitude={sponsor.location.lng}
      latitude={sponsor.location.lat}
      anchor="bottom"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        setPopupInfo(sponsor);
      }}
    >
      <motion.div
        className={`mapbox-marker ${selectedSponsor?.id === sponsor.id ? 'selected' : ''}`}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.2 }}
        onClick={() => onSponsorClick(sponsor)}
      >
        <div className="marker-inner">
          <span>{sponsor.name.charAt(0)}</span>
        </div>
        <div className="marker-pulse"></div>
      </motion.div>
    </Marker>
  ));

  return (
    <motion.div
      key="map"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="sponsors-map-container"
    >
      <div className="mapbox-wrapper">
        <Map
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/light-v11"
          mapboxAccessToken={MAPBOX_TOKEN}
        >
          <NavigationControl position="top-right" />
          
          {markers}

          {popupInfo && (
            <Popup
              anchor="top"
              longitude={popupInfo.location.lng}
              latitude={popupInfo.location.lat}
              onClose={() => setPopupInfo(null)}
              closeButton={true}
              closeOnClick={false}
              className="sponsor-popup"
            >
              <div className="popup-content">
                <div className="popup-logo">
                  {popupInfo.name.charAt(0)}
                </div>
                <div className="popup-info">
                  <strong>{popupInfo.name}</strong>
                  <span>{popupInfo.location.address}</span>
                </div>
                <button 
                  className="popup-details-btn"
                  onClick={() => onSponsorClick(popupInfo)}
                >
                  Detaylar
                </button>
              </div>
            </Popup>
          )}
        </Map>
      </div>

      <div className="map-legend">
        <h4>Sponsor Konumları</h4>
        <p className="map-info-text">Harita üzerindeki noktalar sponsorlarımızın konumlarını göstermektedir.</p>
        <div className="sponsor-count">
          <span className="count-number">{sponsors.length}</span>
          <span className="count-label">Sponsor</span>
        </div>
      </div>
    </motion.div>
  );
}

function SponsorModal({ sponsor, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="sponsor-modal-overlay"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="sponsor-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>
          <CloseIcon />
        </button>
        
        <div className="modal-header">
          <div className="modal-logo">
            {sponsor.name.charAt(0)}
          </div>
        </div>

        <div className="modal-body">
          <h2>{sponsor.name}</h2>
          <p className="modal-description">{sponsor.description}</p>
          
          <div className="modal-info">
            <div className="info-item">
              <LocationIcon />
              <span>{sponsor.location.address}</span>
            </div>
            <div className="info-item">
              <WebIcon />
              <a href={sponsor.website} target="_blank" rel="noopener noreferrer">
                {sponsor.website}
              </a>
            </div>
          </div>

          <a 
            href={sponsor.website} 
            target="_blank" 
            rel="noopener noreferrer"
            className="modal-cta"
          >
            Web Sitesini Ziyaret Et
          </a>
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function WebIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
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
