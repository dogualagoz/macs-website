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
import { motion, AnimatePresence } from 'framer-motion';
import '../../../styles/components/hero.css';

const images = [
  '/assets/heroimages/codedrink.jpg',
  '/assets/heroimages/devbreak.jpg',
  '/assets/heroimages/log.jpg'
];

const HeroSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 7000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="hero" id="home">
      {/* Background Slider */}
      <div className="hero-background-wrapper">
        <AnimatePresence initial={false}>
          <motion.div
            key={currentIndex}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ 
              duration: 3, // Daha yavaş ve akıcı
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
        <h1 className="hero-title">MACS'E HOŞ GELDİNİZ!</h1>
        <p className="hero-subtitle"><strong>
BU SİTE ESKİŞEHİR OSMANGAZİ ÜNİVERSİTESİ MATEMATİK VE BİLGİSAYAR BİLİMLERİ 
BÖLÜMÜ ÖĞRENCİLERİNİN MATEMATİK VE BİLGİSAYAR TOPLULUĞU KULÜBÜNÜN RESMİ SAYFASIDIR. 
        </strong>
        </p>

        {/* Social media badges */}
        <div className="hero-badges">
          <img 
            src="/assets/images/img_920228d74c2145d3b604e2dfb42f2d3f1201a_1.png" 
            alt="MACS" 
            className="badge" 
          />
          <img 
            src="/assets/images/img_esogulogo_1.png"
            alt="ESOGÜ"
            className="badge" 
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSection; 