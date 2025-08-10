import React from "react";

const Footer = () => {
  return (
    <footer id="contact" className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>MACS</h3>
            <p>Matematik ve Bilgisayar Bilimleri Topluluğu</p>
          </div>

          <div className="footer-section">
            <h3>Hızlı Linkler</h3>
            <ul className="footer-links">
              <li><a href="#events">Etkinlikler</a></li>
              <li><a href="#projects">Projeler</a></li>
              <li><a href="#blog">Blog</a></li>
              <li><a href="#resources">Kaynaklar</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h3>İletişim</h3>
            <div className="contact-info">
              <div className="contact-item">
                <img src="/assets/images/img_mail.png" alt="Email" />
                <span>info@macs.edu.tr</span>
              </div>
              <div className="contact-item">
                <img src="/assets/images/img_phone.png" alt="Phone" />
                <span>+90 538 329 6386</span>
              </div>
            </div>
          </div>

          <div className="footer-section">
            <h3>Sosyal Medya</h3>
            <div className="social-links">
              <img src="/assets/images/img_icon.svg" alt="Facebook" />
              <img
                src="/assets/images/img_icon_gray_50_01.svg"
                alt="Twitter"
              />
              <img src="/assets/images/img_logo_youtube.svg" alt="YouTube" />
              <img
                src="/assets/images/img_icon_gray_50_01_18x18.svg"
                alt="Instagram"
              />
            </div>
          </div>
        </div>

        <div className="footer-divider"></div>

        <div className="footer-bottom">
          <img src="/assets/images/img_copyright.png" alt="Copyright" />
          <span>2025 MACS. Tüm hakları saklıdır.</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;


