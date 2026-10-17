/**
 * Halloween temasının çizimleri. Hepsi dekoratif: ekran okuyucudan gizli,
 * renkleri currentColor ya da tema token'larından alıyor.
 */
import React from 'react';
import PropTypes from 'prop-types';

// Köşe ağı: (0,0) köşesinden açılan 6 kol + sarkan halkalar.
// Kutu sol üst köşeye göre çizildi; diğer köşeler için CSS'te aynalanıyor.
export const COBWEB_PATH =
  'M0 0L118 0M0 0L114 30.5M0 0L100.1 62.5M0 0L75.8 90.4M0 0L44.2 109.4M0 0L0 118' +
  'M14 0Q11.1 1.5 13.5 3.6Q10.3 4.5 11.9 7.4Q8.5 7.3 9 10.7Q5.8 9.6 5.2 13Q2.1 11 0 14' +
  'M28 0Q22.2 2.9 27 7.2Q20.5 8.9 23.7 14.8Q16.9 14.7 18 21.4Q11.5 19.2 10.5 26Q4.3 22 0 28' +
  'M44 0Q34.9 4.6 42.5 11.4Q32.3 14 37.3 23.3Q26.6 23.1 28.3 33.7Q18.1 30.2 16.5 40.8Q6.7 34.6 0 44' +
  'M62 0Q49.2 6.5 59.9 16Q45.5 19.8 52.6 32.9Q37.4 32.5 39.9 47.5Q25.5 42.5 23.2 57.5Q9.5 48.7 0 62' +
  'M82 0Q65 8.6 79.2 21.2Q60.2 26.2 69.5 43.5Q49.5 43 52.7 62.8Q33.8 56.2 30.7 76Q12.5 64.4 0 82' +
  'M104 0Q82.5 10.9 100.5 26.9Q76.3 33.2 88.2 55.1Q62.8 54.6 66.8 79.7Q42.9 71.3 39 96.4Q15.9 81.7 0 104';

export function Cobweb({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <path
        d={COBWEB_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

Cobweb.propTypes = {
  className: PropTypes.string,
};

export function Bat({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 100 50" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M50 14C47 14 46 10 45 7C44 10 43 12 42 14C35 10 22 6 4 12C10 15 12 20 11 25C16 22 21 23 24 28C28 24 33 25 36 30C40 27 45 30 50 38C55 30 60 27 64 30C67 25 72 24 76 28C79 23 84 22 89 25C88 20 90 15 96 12C78 6 65 10 58 14C57 12 56 10 55 7C54 10 53 14 50 14Z"
      />
    </svg>
  );
}

Bat.propTypes = {
  className: PropTypes.string,
};

// lit: gözler ve ağız içeriden yanıyor (mum yanık).
export function Pumpkin({ className = '', lit = false }) {
  const face = lit ? '#ffd27a' : '#3a1606';
  return (
    <svg className={className} viewBox="0 0 32 30" aria-hidden="true" focusable="false">
      <path fill="#4f7a28" d="M15 7c0-3 1-5 4-6l1 2c-2 1-2.5 2.5-2.5 4z" />
      <ellipse cx="9.5" cy="18" rx="7.5" ry="9.5" fill="#d9600f" />
      <ellipse cx="22.5" cy="18" rx="7.5" ry="9.5" fill="#d9600f" />
      <ellipse cx="16" cy="18" rx="8.5" ry="10.5" fill="#ff7a1a" />
      <path fill={face} d="M9.5 16.5L12 12.5L14.5 16.5ZM17.5 16.5L20 12.5L22.5 16.5Z" />
      <path
        fill={face}
        d="M8.5 20Q16 28 23.5 20L21.6 21.2L20.2 19.7L18.6 21.6L16 20.2L13.4 21.6L11.8 19.7L10.4 21.2Z"
      />
    </svg>
  );
}

Pumpkin.propTypes = {
  className: PropTypes.string,
  lit: PropTypes.bool,
};

export function Ghost({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 120 136" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M60 6C28 6 12 32 12 64V120Q20 134 28 122Q36 134 44 122Q52 134 60 122Q68 134 76 122Q84 134 92 122Q100 134 108 120V64C108 32 92 6 60 6Z"
      />
      <ellipse cx="44" cy="58" rx="7" ry="10" fill="var(--hw-night, #140b22)" />
      <ellipse cx="76" cy="58" rx="7" ry="10" fill="var(--hw-night, #140b22)" />
      <ellipse cx="60" cy="86" rx="7" ry="10" fill="var(--hw-night, #140b22)" />
    </svg>
  );
}

Ghost.propTypes = {
  className: PropTypes.string,
};
