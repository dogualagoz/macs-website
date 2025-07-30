import React, {} from 'react';
import PropTypes from 'prop-types';
import '../../styles/components/header.css';

const Header = ({ isScrolled }) => {
  // const[activate,setActive] = useState(null)
  return (
    <header className={`header ${isScrolled ? 'header-scrolled' : ''}`}>
      <div className="header-container">
        <div className="logo">
          <img src="/assets/images/img_exclude.png" alt="MACS Logo" />
        </div>
        <nav className='nav-menu'>
          <ul>
            <li><a  href="#home" >Ana Sayfa</a></li>
            <li><a href="#events">Etkinlikler</a></li>
            <li><a href="#projects">Projeler</a></li>
            <li><a href="#BlogMakale">Blog/Makaleler</a></li>
            <li><a href="#soruces">Kaynaklar</a></li>
            <li><a href="#about">Hakkımızda</a></li>
            <li><a href="#contact">İletişim</a></li>
          </ul>
        </nav>
        <div className="Button">
          <button className="JoinUs"><span>Bize Katıl!</span></button>
        </div>
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