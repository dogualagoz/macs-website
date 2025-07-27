/**
 * HeroSection Component
 * 
 * The main landing section of the website featuring:
 * - MACS logo
 * - Welcome message
 * - Community description
 * - Social media badges
 */
import React from 'react';
import '../../styles/components/hero.css';


const HeroSection = () => {
  return (
    <section className="hero" id="home">
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