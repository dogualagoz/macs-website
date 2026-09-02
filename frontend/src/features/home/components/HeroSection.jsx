/**
 * HeroSection Component
 * 
 * The main landing section of the website featuring:
 * - MACS logo
 * - Welcome message
 * - Community description
 * - Social media badges
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import '../../../styles/components/hero.css';

const images = [
  '/assets/heroimages/codedrink.jpg',
  '/assets/heroimages/devbreak.jpg',
  '/assets/heroimages/log.jpg'
];

const HeroSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    // Preload images
    images.forEach((src) => {
      const img = new Image();
      img.src = src;
    });

    if (reduceMotion) return undefined;

    let timer;

    const startTimer = () => {
      timer = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
      }, 7000);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(timer);
      } else {
        // Sayfa tekrar görünür olduğunda zamanlayıcıyı sıfırdan başlat
        clearInterval(timer);
        startTimer();
      }
    };

    startTimer();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [reduceMotion]);

  return (
    <section className="hero" id="home">
      {/* Background Slider */}
      <div className="hero-background-wrapper">
        <AnimatePresence initial={false}>
          <motion.div
            key={currentIndex}
            initial={reduceMotion ? false : { x: '100%' }}
            animate={{ x: 0 }}
            exit={reduceMotion ? undefined : { x: '-100%' }}
            transition={{ 
              duration: reduceMotion ? 0 : 3, // Daha yavaş ve akıcı
              ease: [0.45, 0, 0.55, 1], // Kusursuz senkronizasyon için özel easing
            }}
            className="hero-slide-container"
          >
            <div 
              className="hero-background-image" 
              style={{ backgroundImage: `url(${images[currentIndex]})` }} 
            />
          </motion.div>
        </AnimatePresence>
        <div className="hero-overlay" />
      </div>

      <div className="hero-container">
        {/* Main logo */}
        <div className="hero-logo">
          <img 
            src="/assets/images/img_exclude.png"   
            alt="MACS Logo" 
            className="main-logo" 
          />
        </div>

        {/* Welcome message and description */}
        <h1 className="hero-title">Matematik ve bilgisayarın buluşma noktası</h1>
        <p className="hero-subtitle">
          Eskişehir Osmangazi Üniversitesi Matematik ve Bilgisayar Bilimleri
          bölümü öğrencilerinin kulübü MACS; projeler, etkinlikler ve atölyelerle
          üretir.
        </p>

        {/* Primary calls to action */}
        <div className="hero-cta">
          <Link to="/etkinlikler" className="hero-btn hero-btn--primary">
            Etkinlikleri Keşfet
          </Link>
          <Link to="/projeler" className="hero-btn hero-btn--ghost">
            Projeler
          </Link>
        </div>

        {/* Social media badges */}
        <div className="hero-badges">
          <img 
            src="/assets/images/img_920228d74c2145d3b604e2dfb42f2d3f1201a_1.png" 
            alt="MACS rozeti" 
            className="badge" 
          />
          <img 
            src="/assets/images/img_esogulogo_1.png"
            alt="Eskişehir Osmangazi Üniversitesi rozeti"
            className="badge" 
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSection; 