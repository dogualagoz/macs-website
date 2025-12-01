import React from "react";
import '../../../styles/components/about.css';
const AboutSection = () => {
  return (
    <section id="about" className="about-section" style={{ cursor: "default" }}>
      
      <div className="container">
        <h2 className="section-title">Hakkımızda</h2>
        <p className="about-description">
          MACS; matematik, bilgisayar bilimi ve teknolojiye ilgi duyan
          öğrencileri bir araya getiren öğrenci odaklı bir topluluktur. Amacımız,
          sınıf ortamının ötesine geçen, ilham verici ve iş birliğine açık bir
          öğrenme alanı oluşturmaktır. Uygulamalı atölyelerden vizyon açıcı
          seminerlere kadar birçok etkinlikle, fikirlerin gerçeğe dönüştüğü bir
          alan sunuyoruz.
        </p>

        <div className="mission-card">
          <h3 className="mission-title">Misyonumuz</h3>
          <p className="mission-text">
            Misyonumuz; akademik bilgi ile gerçek dünya uygulamaları arasındaki
            köprüyü kurarak sürekli öğrenme, yaratıcılık ve ekip çalışmasını
            teşvik eden bir kültür oluşturmaktır. Öğrencileri matematik ve
            bilgisayar biliminin dinamik dünyasını keşfetmeye, güçlü bağlar
            kurmaya ve birlikte teknolojik yenilikler üretmeye teşvik ediyoruz.
          </p>
        </div>

        <div className="values-card">
          <h3 className="values-title">Değerlerimiz</h3>
          <div className="values-grid">
            <div className="value-item">
              <div className="value-header">
                <img
                  src="../assets/images/img_people_25x27.png"
                  alt="Community"
                  className="value-icon"
                />
                <span className="value-name">Topluluk</span>
              </div>
              <p className="value-description">
                MACS kendini ait ve güvende hissedebileceğin, destekleyici bir
                ortam ve birlikte büyüdüğümüz bir topluluktur.
              </p>
            </div>

            <div className="value-item">
              <div className="value-header">
                <img
                  src="../assets/images/img_graduation_cap.png"
                  alt="Learning"
                  className="value-icon"
                />
                <span className="value-name">Öğrenme</span>
              </div>
              <p className="value-description">
                Merak ederiz, araştırırız ve paylaşırız. Her etkinlikte
                birbirimizden öğrenmeye önem veririz.
              </p>
            </div>

            <div className="value-item">
              <div className="value-header">
                <img
                  src="../assets/images/img_innovation.png"
                  alt="Innovation"
                  className="value-icon"
                />
                <span className="value-name">Yenilik</span>
              </div>
              <p className="value-description">
                Yeni fikirlere açığız. Denemekten korkmadan, yaratıcılığı
                destekleriz.
              </p>
            </div>

            <div className="value-item">
              <div className="value-header">
                <img
                  src="../assets/images/img_handshake.png"
                  alt="Collaboration"
                  className="value-icon"
                />
                <span className="value-name">İş Birliği</span>
              </div>
              <p className="value-description">
                Birlikte üretmenin gücüne inanırız. Ekip çalışmasıyla daha büyük
                işler başarırız.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
