import React, {} from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import '../../styles/components/header.css'
import { useState } from 'react';

const Header = ({ isScrolled }) => {
  const [menuOpen, setMenuOpen] = useState(false); // Menü açık/kapalı durumu

  const toggleMenu = () => {
    setMenuOpen(prev => !prev);
  }

  return (
    <header className={`header ${isScrolled ? 'header-scrolled' : ''}`}>
      <div className="header-container">
        <div className="logo">
          <a href="/">
            <img src="/assets/images/img_exclude.png" alt="MACS Logo" />
          </a>
        </div>
        <nav className="nav-menu">
          <ul>
            <li><Link to="/">Ana Sayfa</Link></li>
            <li><a href="/#events">Etkinlikler</a></li>
            <li><a href="/#projects">Projeler</a></li>
            {/* <li><a href="#BlogMakale">Blog/Makaleler</a></li>
            <li><a href="#soruces">Kaynaklar</a></li> */}
            <li><a href="/#about">Hakkımızda</a></li>
            <li><a href="/#contact">İletişim</a></li>
          </ul>
        </nav>
        <div className="Button">
          <button className="JoinUs"><span>Bize Katıl!</span></button>
        </div>
      </div>

      <div className="responsive-navbar">
        <div className="r-logo">
              <a href="/"><img src="/assets/images/img_exclude.png" alt="" /></a>
        </div>
        <div className='menu-icon'  onClick={toggleMenu}>
            <img src= "/assets/images/img_menu.png"alt="Menu"  />
        </div>
          <nav className= {`r-navbar${menuOpen ? " active" : ""}`}>
            <img className='close-icon' src="/assets/images/img_close.png" alt="kapat" onClick={toggleMenu} />
            <ul>
              <li><Link to="/" onClick={() => setMenuOpen(false)}>Ana Sayfa</Link></li>
              <li><a href="/#events" onClick={() => setMenuOpen(false)}>Etkinlikler</a></li>
              <li><a href="/#projects" onClick={() => setMenuOpen(false)}>Projeler</a></li>
              {/* <li><a href="#BlogMakale" onClick={() => setMenuOpen(false)}>Blog/Makaleler</a></li>
              <li><a href="#soruces" onClick={() => setMenuOpen(false)}>Kaynaklar</a></li> */}
              <li><a href="/#about" onClick={() => setMenuOpen(false)}>Hakkımızda</a></li>
              <li><a href="/#contact" onClick={() => setMenuOpen(false)}>İletişim</a></li>
              <li><button type="button" onClick={() => setMenuOpen(false)}>Bize Katıl</button></li>
          </ul>
          </nav>
        </div>

    </header>
  );
};

Header.propTypes = {
  isScrolled: PropTypes.bool
};

Header.defaultProps = {
  isScrolled: false
};

export default Header; 