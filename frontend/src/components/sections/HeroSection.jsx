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
        <p className="hero-subtitle">
          MACS topluluğu ile bilgisayar ve matematik dünyasını keşfetmeye hazır mısın?
        </p>

        {/* Social media badges */}
        <div className="hero-badges">
          <img 
            src="/assets/images/img_esogulogo_1.png" 
            alt="ESOGÜ" 
            className="badge" 
          />
          <img 
            src="/assets/images/img_github.png" 
            alt="GitHub" 
            className="badge" 
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSection; 