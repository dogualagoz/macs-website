import React, {} from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import '../../styles/components/header.css';

const Header = ({ isScrolled }) => {
  // const[activate,setActive] = useState(null)
  return (
    <header className={`header ${isScrolled ? 'header-scrolled' : ''}`}>
      <div className="header-container">
        <div className="logo">
          <Link to="/">
            <img src="/assets/images/img_exclude.png" alt="MACS Logo" />
          </Link>
        </div>
        <nav className='nav-menu'>
          <ul>
            <li><Link to="/">Ana Sayfa</Link></li>
            <li><Link to="/etkinlikler">Etkinlikler</Link></li>
            <li><Link to="/projeler">Projeler</Link></li>
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