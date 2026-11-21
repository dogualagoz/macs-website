import React, { useEffect, useRef, useState } from 'react';
import { m } from 'framer-motion';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { eskisehirCenter } from '../data/mockSponsors';
import env from '../../../shared/config/env';
import { handleAvatarError } from '../../../utils/imageUtils';
import { MapIcon, LocationIcon, GoogleMapsIcon } from './SponsorIcons';

// Ayri chunk: react-map-gl modul yuklenirken import('mapbox-gl') baslatir
// (~270 KB gzip). SponsorsPage bu dosyayi yalnizca harita gorunumu ekrana
// yaklastiginda lazy yukler.
const MAPBOX_TOKEN = env.mapboxToken;
const MARKER_TAP_DISTANCE = 8;

export default function SponsorsMap({ sponsors }) {
  const [popupInfo, setPopupInfo] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const [mapError, setMapError] = useState(false);
  const markerPress = useRef(null);
  const markerClickPointer = useRef(null);
  const markerClickTimeout = useRef(null);
  const mapClickTimeout = useRef(null);
  const popupCloseTimeout = useRef(null);
  const [viewState, setViewState] = useState({
    longitude: eskisehirCenter.lng,
    latitude: eskisehirCenter.lat,
    zoom: 12
  });

  useEffect(() => {
    const finishMarkerPointer = (e) => {
      if (markerClickPointer.current !== e.pointerId) return;

      clearTimeout(markerClickTimeout.current);
      markerClickTimeout.current = setTimeout(() => {
        markerClickPointer.current = null;
        if (markerPress.current?.pointerId === e.pointerId) markerPress.current = null;
      }, 0);
    };

    window.addEventListener('pointerup', finishMarkerPointer, true);
    window.addEventListener('pointercancel', finishMarkerPointer, true);
    return () => {
      window.removeEventListener('pointerup', finishMarkerPointer, true);
      window.removeEventListener('pointercancel', finishMarkerPointer, true);
      clearTimeout(popupCloseTimeout.current);
      clearTimeout(markerClickTimeout.current);
      clearTimeout(mapClickTimeout.current);
    };
  }, []);

  const handleClosePopup = (e) => {
    if (e?.originalEvent && mapClickTimeout.current !== null) return;
    if (e?.originalEvent?.target?.closest?.('.sponsors-map__marker')) return;

    if (popupInfo && !isClosing) {
      clearTimeout(popupCloseTimeout.current);
      setIsClosing(true);
      popupCloseTimeout.current = setTimeout(() => {
        setPopupInfo(null);
        setIsClosing(false);
      }, 200); // Animasyon süresiyle eşleşmeli
    }
  };

  const showPopup = (sponsor) => {
    clearTimeout(popupCloseTimeout.current);
    setIsClosing(false);
    setPopupInfo(sponsor);
  };

  const toggleMarkerPopup = (sponsor) => {
    if (popupInfo?.id === sponsor.id && !isClosing) {
      handleClosePopup();
    } else {
      showPopup(sponsor);
    }
  };

  const handleMarkerPointerDown = (sponsor, e) => {
    if (!e.isPrimary || e.button !== 0) return;

    clearTimeout(markerClickTimeout.current);
    markerClickPointer.current = e.pointerId;
    markerPress.current = {
      pointerId: e.pointerId,
      sponsorId: sponsor.id,
      x: e.clientX,
      y: e.clientY
    };

    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // Synthetic events can have a pointer ID that the browser cannot capture.
    }
  };

  const clearMarkerPress = (e) => {
    if (markerPress.current?.pointerId === e.pointerId) markerPress.current = null;
  };

  const movedPastTapDistance = (press, e) =>
    Math.hypot(e.clientX - press.x, e.clientY - press.y) >= MARKER_TAP_DISTANCE;

  const handleMarkerPointerMove = (e) => {
    const press = markerPress.current;
    if (press?.pointerId === e.pointerId && movedPastTapDistance(press, e)) {
      clearMarkerPress(e);
    }
  };

  const handleMarkerPointerUp = (sponsor, e) => {
    const press = markerPress.current;
    if (!press || press.pointerId !== e.pointerId || press.sponsorId !== sponsor.id) return;

    clearMarkerPress(e);
    if (movedPastTapDistance(press, e)) return;

    // A click following capture can target the map instead of the marker.
    clearTimeout(mapClickTimeout.current);
    mapClickTimeout.current = setTimeout(() => {
      mapClickTimeout.current = null;
    }, 0);
    toggleMarkerPopup(sponsor);
  };

  const handleMarkerKeyDown = (sponsor, e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;

    e.preventDefault();
    if (!e.repeat) toggleMarkerPopup(sponsor);
  };

  const handleSidebarClick = (sponsor) => {
    // Koordinatsiz sponsorun popup'i zaten cizilemiyor; secili isaretlemek
    // tiklamayi cevapsiz birakirdi. Bu yuzden hic secilmiyor.
    if (!sponsor.location?.lat || !sponsor.location?.lng) return;

    showPopup(sponsor);
    setViewState(prev => ({
      ...prev,
      longitude: sponsor.location.lng,
      latitude: sponsor.location.lat,
      zoom: 14
    }));
  };

  const mapFallback = mapError || !MAPBOX_TOKEN;
  const markerCount = sponsors.filter(s => s.location?.lat && s.location?.lng).length;

  if (mapFallback) {
    return (
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sponsors-map"
      >
        <div
          className="sponsors-map__container"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            background: '#f3f4f6',
            color: '#4b5563',
            textAlign: 'center',
            padding: '24px',
          }}
        >
          <MapIcon width={40} height={40} />
          <strong style={{ color: '#1f2937' }}>Harita şu anda yüklenemedi</strong>
          <span>
            {markerCount} sponsor konumu listeden görüntülenebilir.
          </span>
        </div>
      </m.div>
    );
  }

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="sponsors-map"
    >
      <div
        className="sponsors-map__container"
        onPointerDownCapture={(e) => {
          if (!e.isPrimary) markerPress.current = null;
        }}
      >
        <Map
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={MAPBOX_TOKEN}
          onClick={handleClosePopup}
          onError={() => setMapError(true)}
          reuseMaps
        >
          <NavigationControl position="top-right" />

          {sponsors.filter(s => s.location?.lat && s.location?.lng).map((sponsor) => (
            <Marker
              key={sponsor.id}
              longitude={sponsor.location.lng}
              latitude={sponsor.location.lat}
              anchor="bottom"
            >
              <div
                className={`sponsors-map__marker ${popupInfo?.id === sponsor.id ? 'sponsors-map__marker--active' : ''}`}
                role="button"
                aria-label={`${sponsor.name} konumunu göster`}
                aria-expanded={popupInfo?.id === sponsor.id && !isClosing}
                tabIndex={0}
                onClick={() => {
                  if (markerClickPointer.current === null) toggleMarkerPopup(sponsor);
                }}
                onPointerDown={(e) => handleMarkerPointerDown(sponsor, e)}
                onPointerMove={handleMarkerPointerMove}
                onPointerUp={(e) => handleMarkerPointerUp(sponsor, e)}
                onPointerCancel={clearMarkerPress}
                onLostPointerCapture={clearMarkerPress}
                onKeyDown={(e) => handleMarkerKeyDown(sponsor, e)}
              >
                {sponsor.imageUrl ? (
                  <img loading="lazy" decoding="async"
                    src={sponsor.imageUrl}
                    alt={sponsor.name}
                    className="sponsors-map__marker-image"
                    draggable={false}
                    onError={(e) => handleAvatarError(e, sponsor.name)}
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
                      <img loading="lazy" decoding="async"
                        src={popupInfo.imageUrl}
                        alt={popupInfo.name}
                        className="sponsor-popup__avatar"
                        onError={(e) => handleAvatarError(e, popupInfo.name)}
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
          {sponsors.map((sponsor) => {
            const hasLocation = Boolean(sponsor.location?.lat && sponsor.location?.lng);

            return (
            <m.div
              key={sponsor.id}
              onClick={() => handleSidebarClick(sponsor)}
              whileHover={hasLocation ? { scale: 1.02 } : undefined}
              whileTap={hasLocation ? { scale: 0.98 } : undefined}
              className={`sponsors-sidebar__item ${hasLocation ? '' : 'sponsors-sidebar__item--no-location'} ${popupInfo?.id === sponsor.id ? 'sponsors-sidebar__item--active' : ''}`}
            >
              <div className="sponsors-sidebar__item-content">
                <div className={`sponsors-sidebar__item-avatar ${popupInfo?.id === sponsor.id ? 'sponsors-sidebar__item-avatar--active' : ''}`}>
                  {sponsor.imageUrl ? (
                    <img loading="lazy" decoding="async"
                      src={sponsor.imageUrl}
                      alt={sponsor.name}
                      className="sponsors-sidebar__item-avatar-image"
                      onError={(e) => handleAvatarError(e, sponsor.name)}
                    />
                  ) : (
                    (sponsor.name || 'S').charAt(0)
                  )}
                </div>
                <div className="sponsors-sidebar__item-info">
                  <p className="sponsors-sidebar__item-name">
                    {sponsor.name}
                  </p>
                  {sponsor.location?.address ? (
                    <p className="sponsors-sidebar__item-address">
                      {sponsor.location.address}
                    </p>
                  ) : !hasLocation && (
                    <p className="sponsors-sidebar__item-address sponsors-sidebar__item-address--muted">
                      Konum bilgisi yok
                    </p>
                  )}
                </div>
              </div>
            </m.div>
            );
          })}
        </div>
      </div>
    </m.div>
  );
}
