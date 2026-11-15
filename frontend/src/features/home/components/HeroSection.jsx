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
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import '../../../styles/components/hero.css';

const HERO_NAMES = ['codedrink', 'devbreak', 'log'];

/* Iki genislik uretildi (sharp ile, kaynak ayni klasordeki .jpg'ler): 960 ve 1920 px WebP. Ekranin fiziksel genisligine gore biri
   secilir; telefonda 1920'lik dosya (~110-220 KB) yerine 960'lik (~50-80 KB)
   iner. */
const pickHeroWidth = () => {
  if (typeof window === 'undefined') return 1920;
  const physical = window.innerWidth * (window.devicePixelRatio || 1);
  return physical <= 1100 ? 960 : 1920;
};

const heroImages = (width) =>
  HERO_NAMES.map((name) => `/assets/heroimages/${name}-${width}.webp`);

const HeroSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [images] = useState(() => heroImages(pickHeroWidth()));
  const reduceMotion = useReducedMotion();

  // Siradaki gorseli onceden getir. Eskiden uc gorsel acilista birlikte
  // isteniyordu ve ilk gorselle (LCP) bant genisligi paylasiyordu; artik
  // her seferinde yalnizca bir sonraki, gecisten once iniyor.
  useEffect(() => {
    if (reduceMotion) return undefined;
    const next = new Image();
    const timer = setTimeout(() => {
      next.src = images[(currentIndex + 1) % images.length];
    }, 2000);
    return () => clearTimeout(timer);
  }, [currentIndex, images, reduceMotion]);

  useEffect(() => {
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
  }, [reduceMotion, images.length]);

  return (
    <section className="hero" id="home">
      {/* Background Slider */}
      <div className="hero-background-wrapper">
        <AnimatePresence initial={false}>
          <m.div
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
          </m.div>
        </AnimatePresence>
        <div className="hero-overlay" />
      </div>

      <div className="hero-container">
        {/* Main logo */}
        <div className="hero-logo">
          <img
            src="/assets/images/img_exclude.webp"
            alt="MACS Logo"
            className="main-logo"
            width="170" height="170" fetchpriority="high"
          />
        </div>

        {/* Welcome message and description */}
        <h1 className="hero-title">MACS'E HOŞ GELDİNİZ!</h1>
        <p className="hero-subtitle">
          BU SİTE ESKİŞEHİR OSMANGAZİ ÜNİVERSİTESİ MATEMATİK VE BİLGİSAYAR BİLİMLERİ BÖLÜMÜ ÖĞRENCİLERİNİN MATEMATİK VE BİLGİSAYAR TOPLULUĞU KULÜBÜNÜN RESMİ SAYFASIDIR.
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
            width="82" height="66" loading="lazy"
          />
          <img
            src="/assets/images/img_esogulogo_1.png"
            alt="Eskişehir Osmangazi Üniversitesi rozeti"
            className="badge"
            width="67" height="67" loading="lazy"
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
