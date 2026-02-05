import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import '../../../styles/components/header.css';

const Header = ({ isScrolled = false }) => {
  const [menuOpen, setMenuOpen] = useState(false); // Menü açık/kapalı durumu
  const location = useLocation();

  const toggleMenu = () => {
    setMenuOpen(prev => !prev);
  }

  // Projeler sayfasında mıyız kontrol et
  const isProjectsPage = location.pathname.startsWith('/projeler');

  // İletişim linkine tıklandığında footer'a scroll (her sayfada çalışır)
  const handleContactClick = (e) => {
    e.preventDefault();
    setMenuOpen(false);
    
    // Footer her sayfada mevcut, direkt scroll yap
    const scrollToFooter = () => {
      const footer = document.getElementById('contact');
      if (footer) {
        footer.scrollIntoView({ behavior: 'smooth' });
        return true;
      }
      return false;
    };

    // Eğer hemen bulamazsa biraz bekle (sayfa yüklenme durumu için)
    if (!scrollToFooter()) {
      setTimeout(scrollToFooter, 100);
    }
  };

  return (
    <header className={`header ${isScrolled ? 'header-scrolled' : ''} ${isProjectsPage ? 'header-dark' : ''}`}>
      <div className="header-container">
        <div className="logo">
          <a href="/">
            <img src="/assets/images/img_exclude.png" alt="MACS Logo" />
          </a>
        </div>
        <nav className="nav-menu">
          <ul>
            <li><Link to="/#home">Ana Sayfa</Link></li>
            <li><Link to="/etkinlikler">Etkinlikler</Link></li>
            <li><Link to="/projeler">Projeler</Link></li>
            <li><Link to="/sponsorluk">Sponsorlarımız</Link></li>
            <li><Link to="/hakkimizda">Hakkımızda</Link></li>
            <li><a href="#contact" onClick={handleContactClick}>İletişim</a></li>
          </ul>
        </nav>
        <div className="Button">
          <a href="https://forms.gle/MXaCH1YG3qE4rsX36" target="_blank" rel="noopener noreferrer" className="JoinUs"><span>Bize Katıl!</span></a>
        </div>
      </div>

      <div className="responsive-navbar">
        <div className="r-logo">
              <a href="/"><img src="/assets/images/img_exclude.png" alt="" /></a>
        </div>
        <div className='menu-icon' onClick={toggleMenu}>
            <img src="/assets/images/img_menu.png" alt="Menu" />
        </div>
          <nav className={`r-navbar${menuOpen ? " active" : ""}`}>
            <img className='close-icon' src="/assets/images/img_close.png" alt="kapat" onClick={toggleMenu} />
            <ul>
              <li><Link to="/#home" onClick={() => setMenuOpen(false)}>Ana Sayfa</Link></li>
              <li><Link to="/etkinlikler" onClick={() => setMenuOpen(false)}>Etkinlikler</Link></li>
              <li><Link to="/projeler" onClick={() => setMenuOpen(false)}>Projeler</Link></li>
              <li><Link to="/sponsorluk" onClick={() => setMenuOpen(false)}>Sponsorlarımız</Link></li>
              <li><Link to="/hakkimizda" onClick={() => setMenuOpen(false)}>Hakkımızda</Link></li>
              <li><a href="#contact" onClick={handleContactClick}>İletişim</a></li>
              <li><a href="https://forms.gle/MXaCH1YG3qE4rsX36" target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>Bize Katıl</a></li>
          </ul>
          </nav>
        </div>

    </header>
  );
};

Header.propTypes = {
  isScrolled: PropTypes.bool
};



export default Header;
 