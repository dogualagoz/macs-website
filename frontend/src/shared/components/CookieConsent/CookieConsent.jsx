import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  CONSENT_DENIED,
  CONSENT_GRANTED,
  OPEN_PREFERENCES_EVENT,
  denyConsent,
  grantConsent,
  isUntrackedPath,
  readConsent,
} from '../../analytics';
import '../../../styles/components/cookie-consent.css';

const CURRENT_CHOICE_LABEL = {
  [CONSENT_GRANTED]: 'Şu anki tercihiniz: kabul edildi.',
  [CONSENT_DENIED]: 'Şu anki tercihiniz: reddedildi.',
};

/**
 * KVKK çerez onay bandı. Seçim yapılmamışsa public sayfalarda alttan
 * görünür; footer'daki "Çerez tercihleri" ile yeniden açılır. Kabul ve Reddet
 * aynı görsel ağırlıkta: reddetmek kabul etmek kadar kolay olmalı.
 */
const CookieConsent = () => {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(() => readConsent() === null);
  const [choice, setChoice] = useState(() => readConsent());
  // Her "Çerez tercihleri" tıklaması artar: bant zaten açıkken tıklansa da
  // odak efekti yeniden çalışır.
  const [openNonce, setOpenNonce] = useState(0);
  const regionRef = useRef(null);
  const reopened = useRef(false);
  // Footer'dan açılınca odağın döneceği eleman (genellikle footer düğmesi).
  const returnFocusRef = useRef(null);

  useEffect(() => {
    const handleOpen = () => {
      const active = document.activeElement;
      const insideBanner = regionRef.current && active && regionRef.current.contains(active);
      if (!insideBanner && active && active !== document.body) {
        returnFocusRef.current = active;
      }
      reopened.current = true;
      setChoice((prev) => readConsent() ?? prev);
      setOpenNonce((n) => n + 1);
      setOpen(true);
    };
    window.addEventListener(OPEN_PREFERENCES_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, handleOpen);
  }, []);

  // Footer'dan açıldığında klavye kullanıcısı bandın başına taşınsın.
  useEffect(() => {
    if (open && reopened.current && regionRef.current) {
      reopened.current = false;
      regionRef.current.focus();
    }
  }, [open, openNonce]);

  if (!open || isUntrackedPath(pathname)) return null;

  const close = () => {
    const target = returnFocusRef.current;
    returnFocusRef.current = null;
    reopened.current = false;
    setOpen(false);
    if (target && target.isConnected && typeof target.focus === 'function') {
      target.focus();
    }
  };

  const choose = (value) => {
    if (value === CONSENT_GRANTED) {
      grantConsent();
    } else {
      denyConsent();
    }
    setChoice(value);
    close();
  };

  // Escape yalnızca daha önce seçim yapılmışsa (bant yeniden açılmışsa)
  // kapatır; ilk ziyarette bir seçim yapılması gerekir.
  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && choice !== null) {
      event.stopPropagation();
      close();
    }
  };

  return (
    <div
      ref={regionRef}
      className="cookie-consent"
      role="region"
      aria-label="Çerez tercihleri"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <div className="cookie-consent__inner">
        <p className="cookie-consent__text">
          Siteyi geliştirmek için ziyaret istatistiklerini Google Analytics ile ölçüyoruz. Bu, analitik çerezleri kullanır.
          {choice && <span className="cookie-consent__current"> {CURRENT_CHOICE_LABEL[choice]}</span>}
        </p>
        <div className="cookie-consent__actions">
          <button
            type="button"
            className="cookie-consent__button"
            onClick={() => choose(CONSENT_GRANTED)}
          >
            Kabul et
          </button>
          <button
            type="button"
            className="cookie-consent__button"
            onClick={() => choose(CONSENT_DENIED)}
          >
            Reddet
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
