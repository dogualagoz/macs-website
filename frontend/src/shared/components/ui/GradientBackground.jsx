import React from 'react';
import PropTypes from 'prop-types';

/**
 * GradientBackground — "MACS Shimmer"
 * 21st.dev Gradient Builder'daki "Oceanic Shimmer" tarifinden uyarlandı:
 * aynı katman mantığı (taban renk + radial ışıma + grain),
 * renkler sitenin koyu temasına çekildi (gece laciverti + MACS pembesi/mor).
 *
 * Işımalar piksel ölçülü: katman sayfa boyuna gerilse bile üstteki
 * hero ışıması formunu korur, alta doğru temiz laciverte düşer.
 * Beyaz/açık ton yok — gri yıkanma yapmaz.
 *
 * Kullanım (sayfa arkaplanı):
 * <div className="relative min-h-screen bg-[#07132b]">
 *   <div aria-hidden="true" className="absolute inset-0 z-0 pointer-events-none">
 *     <GradientBackground className="h-full w-full" />
 *   </div>
 *   <div className="relative z-10">...içerik...</div>
 * </div>
 */
export function GradientBackground({ className = '', style = {} }) {
  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        // NOT: position burada set edilmiyor — arayan className ile veriyor.
        // Inline position, Tailwind class'ını ezer ve yükseklik 0'a çöküp
        // arkaplan görünmez olur.
        overflow: 'hidden',
        width: '100%',
        height: '100%',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#07132b',
          backgroundImage:
            "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.16'/></svg>\"), radial-gradient(1000px 620px at 50% -120px, rgba(242, 49, 124, 0.38) 0%, rgba(242, 49, 124, 0) 70%), radial-gradient(820px 600px at 88% 300px, rgba(124, 93, 250, 0.20) 0%, rgba(124, 93, 250, 0) 70%), radial-gradient(780px 560px at 6% 420px, rgba(70, 130, 200, 0.18) 0%, rgba(70, 130, 200, 0) 70%), radial-gradient(1000px 560px at 50% 58%, rgba(242, 49, 124, 0.10) 0%, rgba(242, 49, 124, 0) 70%)",
          backgroundSize: '140px 140px, auto, auto, auto, auto',
          backgroundBlendMode: 'overlay, normal, normal, normal, normal',
        }}
      />
      <svg
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0.16,
          mixBlendMode: 'overlay',
        }}
      >
        <filter id="grain-macs-shimmer">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain-macs-shimmer)" />
      </svg>
    </div>
  );
}

GradientBackground.propTypes = {
  className: PropTypes.string,
  style: PropTypes.object,
};

export default GradientBackground;
