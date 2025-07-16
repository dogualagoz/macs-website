import React from "react";
import "./pages/styles.css";
import EventCard from './components/EventCard';

const HomePage = () => {
  return (
    <>
      {/* Header Section */}
      <header className="header">
        <nav className="nav-container">
          <ul className="nav-menu">
            <li><a href="#main" className="nav-item active">Ana Sayfa</a></li>
            <li><a href="#events" className="nav-item">Etkinlikler</a></li>
            <li><a href="#projects" className="nav-item">Projeler</a></li>
            <li><a href="#blog" className="nav-item">Blog/Makaleler</a></li>
            <li><a href="#resources" className="nav-item">Kaynaklar</a></li>
            <li><a href="#about" className="nav-item">Hakkımızda</a></li>
            <li><a href="#contact" className="nav-item">İletişim</a></li>
          </ul>
          <button className="join-btn">Bize Katıl !</button>
        </nav>
      </header>

      {/* Hero Section */}
      <section id="main" className="hero">
        <div className="hero-content">
          <img
            src="/assets/images/img_exclude.png"
            alt="MACS Logo"
            className="hero-logo"
          />
          <h1 className="hero-title" style={{ cursor: 'default' }}>MACS'E HOŞ GELDİNİZ!</h1>
          <p className="hero-description" style={{ cursor: 'default' }}>
            BU SİTE ESKİŞEHİR OSMANGAZİ ÜNİVERSİTESİ MATEMATİK VE BİLGİSAYAR
            BİLİMLERİ BÖLÜMÜ ÖĞRENCİLERİNİN MATEMATİK VE BİLGİSAYAR TOPLULUĞU KULÜBÜNÜN
            RESMİ SAYFASIDIR.
          </p>
          <div className="hero-logos">
            <img
              src="/assets/images/img_920228d74c2145d3b604e2dfb42f2d3f1201a_1.png"
              alt="MACS Logo"
            />
            <img src="/assets/images/img_esogulogo_1.png" alt="ESOGU Logo" />
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section id="events" className="events-section">
        <div className="container">
          <h2 className="section-title" style={{ cursor: 'default' }}>Etkinlikler</h2>
          <p className="section-subtitle" style={{ cursor: 'default' }}>
            Matematik ve bilgisayar bilimleri alanında düzenlediğimiz etkinlikler,
            workshoplar ve seminerler
          </p>

          <div className="filter-tabs">
            <button className="filter-tab active" data-filter="all">Tümü</button>
            <button className="filter-tab" data-filter="upcoming">Yaklaşan</button>
            <button className="filter-tab" data-filter="past">Geçmiş</button>
            <button className="filter-tab" data-filter="workshop">Workshop</button>
          </div>

        {{/* Featured Event*/}}
        <div class="featured-event">
          <div class="featured-event-image">Öne Çıkan Etkinlik Görseli</div>
          <div class="featured-event-content">
            <div class="event-meta">
              <span class="event-badge">Öne Çıkan</span>
              <img src="/assets/images/img_calender.png" alt="Calendar" />
              <span>15 Eylül 2025</span>
            </div>
            <h3 class="event-title" style="cursor: default">
              Yapay Zeka ve Makine Öğrenmesi Workshop'u
            </h3>
            <p class="event-description" style="cursor: default">
              Python kullanarak yapay zeka ve makine öğrenmesi temellerini
              öğrenin. Uygulamalı projelerle desteklenen 2 günlük yoğun workshop
              programı.
            </p>
            <div class="event-details" style="cursor: default">
            {{/*CURSOR KOYULDU*/}}
              <img src="/assets/images/img_clock.png" alt="Clock" />
              <span>14:00 - 18:00</span>
              <img src="/assets/images/img_location.png" alt="Location" />
              <span>Bilgisayar Lab 1</span>
              <img src="/assets/images/img_people.png" alt="People" />
              <span>25 Katılımcı</span>
            </div>
            <button class="register-btn">Kayıt Ol</button>
          </div>
        </div>

        {{/* Events Grid */}}
        <div class="events-grid">
          <EventCard 
            title="MACS 25 - 26 Dönem Başlangıcı Semineri"
            description="Birbirinden farklı konuşmacıların olduğu MACS yeni eğitim yılı başlangıç etkinliği."
            date="15 Eylül 2025"
            time="14:00 - 18:00"
            image="Dönem Başlangıcı Semineri"
          />

          <div class="event-card" style="cursor: default">
          {{/*CURSOR KOYULDU*/}}
            <div class="event-card-image">Dönem Başlangıcı Semineri</div>
            <div class="event-card-content">
              <div class="event-card-meta">
                <span class="event-card-badge">Yaklaşan</span>
                <img src="/assets/images/img_calender.png" alt="Calendar" />
                <span>15 Eylül 2025</span>
              </div>
              <h4 class="event-card-title">
                MACS 25 - 26 Dönem Başlangıcı Semineri
              </h4>
              <p class="event-card-description">
                Birbirinden farklı konuşmacıların olduğu MACS yeni eğitim yılı
                başlangıç etkinliği.
              </p>
              <div class="event-card-footer">
                <div class="event-card-time">
                  <img src="/assets/images/img_clock.png" alt="Clock" />
                  <span>14:00 - 18:00</span>
                </div>
                <a href="#" class="event-card-details">Detaylar</a>
              </div>
            </div>
          </div>

          <div class="event-card" style="cursor: default">
          {{/*CURSOR KOYULDU*/}}
            <div class="event-card-image">Dönem Başlangıcı Semineri</div>
            <div class="event-card-content">
              <div class="event-card-meta">
                <span class="event-card-badge">Yaklaşan</span>
                <img src="/assets/images/img_calender.png" alt="Calendar" />
                <span>15 Eylül 2025</span>
              </div>
              <h4 class="event-card-title">
                MACS 25 - 26 Dönem Başlangıcı Semineri
              </h4>
              <p class="event-card-description">
                Birbirinden farklı konuşmacıların olduğu MACS yeni eğitim yılı
                başlangıç etkinliği.
              </p>
              <div class="event-card-footer">
                <div class="event-card-time">
                  <img src="/assets/images/img_clock.png" alt="Clock" />
                  <span>14:00 - 18:00</span>
                </div>
                <a href="#" class="event-card-details">Detaylar</a>
              </div>
            </div>
          </div>
        </div>

        <button class="load-more-btn">Daha Fazla Etkinlik Yükle</button>
      </div>
    </section>

    {{/* Projects Section */}}
    <section id="projects" class="projects-section" style="cursor: default">
    {{/*CURSOR KOYULDU*/}}
      <div class="container">
        <h2 class="section-title">Projeler</h2>
        <p class="section-subtitle">
          Matematik ve bilgisayar bilimleri alanında geliştirdiğimiz yenilikçi
          projeler ve araştırmalarımız.
        </p>

        {{/* Featured Project */}}
        <div class="featured-project">
          <div class="featured-project-image"></div>
          <div class="featured-project-content">
            <div class="project-badge">
              <img src="/assets/images/img_star.png" alt="Star" />
              Öne Çıkan
            </div>
            <h3 class="project-title">Yapay Zeka Destekli Öğrenme Platformu</h3>
            <p class="project-description">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
              enim ad minim veniam, quis nostrud
            </p>
            <div class="project-tags">
              <span class="project-tag">Python</span>
              <span class="project-tag">TensorFlow</span>
              <span class="project-tag">React</span>
              <span class="project-tag">Machine Learning</span>
            </div>
            <div class="project-actions">
              <a href="#" class="project-btn primary">
                <img src="/assets/images/img_linking.png" alt="Link" />
                Projeyi İncele
              </a>
              <a href="#" class="project-btn secondary">
                <img src="/assets/images/img_github.png" alt="GitHub" />
                GitHub
              </a>
            </div>
          </div>
        </div>

        {{/* Project Filters */}}
        <div class="project-filters">
          <button class="project-filter active" data-filter="all">Tümü</button>
          <button class="project-filter" data-filter="web">
            Web Geliştirme
          </button>
          <button class="project-filter" data-filter="ai">Yapay Zeka</button>
          <button class="project-filter" data-filter="mobile">
            Mobil Uygulama
          </button>
          <button class="project-filter" data-filter="math">Matematik</button>
          <button class="project-filter" data-filter="research">
            Araştırma
          </button>
        </div>

        {{/* Projects Grid */}}
        <div class="projects-grid">
          <div class="project-card">
            <div class="project-card-image">Dönem Başlangıcı Semineri</div>
            <div class="project-card-content">
              <div class="project-card-category">
                <img src="/assets/images/img_source_code.png" alt="Code" />
                <span>Web Geliştirme</span>
              </div>
              <h4 class="project-card-title">Öğrenci Bilgi Sistemi</h4>
              <p class="project-card-description">
                Modern web teknolojileri kullanarak geliştirilen kapsamlı
                öğrenci yönetim sistemi.
              </p>
              <div class="project-card-tags">
                <span class="project-card-tag">React</span>
                <span class="project-card-tag">Node.js</span>
                <span class="project-card-tag">MongoDB</span>
              </div>
              <div class="project-card-footer">
                <div class="project-card-author">
                  <img
                    src="/assets/images/img_shape.png"
                    alt="Avatar"
                    class="project-card-avatar"
                  />
                  <span class="project-card-author-name">Ayşe Yıldız</span>
                </div>
                <img
                  src="/assets/images/img_right.png"
                  alt="Arrow"
                  class="project-card-arrow"
                />
              </div>
            </div>
          </div>

          <div class="project-card">
            <div class="project-card-image">Dönem Başlangıcı Semineri</div>
            <div class="project-card-content">
              <div class="project-card-category">
                <img src="/assets/images/img_source_code.png" alt="Code" />
                <span>Web Geliştirme</span>
              </div>
              <h4 class="project-card-title">Öğrenci Bilgi Sistemi</h4>
              <p class="project-card-description">
                Modern web teknolojileri kullanarak geliştirilen kapsamlı
                öğrenci yönetim sistemi.
              </p>
              <div class="project-card-tags">
                <span class="project-card-tag">React</span>
                <span class="project-card-tag">Node.js</span>
                <span class="project-card-tag">MongoDB</span>
              </div>
              <div class="project-card-footer">
                <div class="project-card-author">
                  <img
                    src="/assets/images/img_shape.png"
                    alt="Avatar"
                    class="project-card-avatar"
                  />
                  <span class="project-card-author-name">Ayşe Yıldız</span>
                </div>
                <img
                  src="/assets/images/img_right.png"
                  alt="Arrow"
                  class="project-card-arrow"
                />
              </div>
            </div>
          </div>

          <div class="project-card">
            <div class="project-card-image">Dönem Başlangıcı Semineri</div>
            <div class="project-card-content">
              <div class="project-card-category">
                <img src="/assets/images/img_source_code.png" alt="Code" />
                <span>Web Geliştirme</span>
              </div>
              <h4 class="project-card-title">Öğrenci Bilgi Sistemi</h4>
              <p class="project-card-description">
                Modern web teknolojileri kullanarak geliştirilen kapsamlı
                öğrenci yönetim sistemi.
              </p>
              <div class="project-card-tags">
                <span class="project-card-tag">React</span>
                <span class="project-card-tag">Node.js</span>
                <span class="project-card-tag">MongoDB</span>
              </div>
              <div class="project-card-footer">
                <div class="project-card-author">
                  <img
                    src="/assets/images/img_shape.png"
                    alt="Avatar"
                    class="project-card-avatar"
                  />
                  <span class="project-card-author-name">Ayşe Yıldız</span>
                </div>
                <img
                  src="/assets/images/img_right.png"
                  alt="Arrow"
                  class="project-card-arrow"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="text-center">
          <button class="view-all-projects-btn">
            <img src="/assets/images/img_plus_math.png" alt="Plus" />
            Tüm Projeleri Görüntüle
          </button>
        </div>
      </div>
    </section>

    {{/* Blog Section */}}
    <section id="blog" class="blog-section" style="cursor: default">
      {{/*CURSOR KOYULDU*/}}
      <div class="container">
        <h2 class="section-title">Blog ve Makaleler</h2>
        <p class="section-subtitle">
          Yönetim ve katkıda bulunanlardan makaleler ve blog yazıları.
        </p>

        <div class="blog-grid">
          <article class="blog-card">
            <div class="blog-author">
              <img
                src="/assets/images/img_shape_36x38.png"
                alt="Author"
                class="blog-avatar"
              />
              <div>
                <div class="blog-author-info">Prof. Dr. Elif Koç</div>
                <div class="blog-date">10 Ocak 2025</div>
              </div>
            </div>
            <h3 class="blog-title">
              Diferansiyel Geometrinin Temel Prensipleri
            </h3>
            <p class="blog-excerpt">
              Diferansiyel geometri, modern matematiğin en önemli dallarından
              biridir. Bu yazıda temel kavramları ve uygulamalarını
              inceleyeceğiz...
            </p>
            <div class="blog-footer">
              <div class="blog-tags">
                <span class="blog-tag">Matematik</span>
                <span class="blog-tag">Geometri</span>
              </div>
              <a href="#" class="blog-read-more">
                <span>Devamını Oku</span>
                <img src="/assets/images/img_right.png" alt="Arrow" />
              </a>
            </div>
          </article>

          <article class="blog-card">
            <div class="blog-author">
              <img
                src="/assets/images/img_shape_36x38.png"
                alt="Author"
                class="blog-avatar"
              />
              <div>
                <div class="blog-author-info">Prof. Dr. Elif Koç</div>
                <div class="blog-date">10 Ocak 2025</div>
              </div>
            </div>
            <h3 class="blog-title">
              Diferansiyel Geometrinin Temel Prensipleri
            </h3>
            <p class="blog-excerpt">
              Diferansiyel geometri, modern matematiğin en önemli dallarından
              biridir. Bu yazıda temel kavramları ve uygulamalarını
              inceleyeceğiz...
            </p>
            <div class="blog-footer">
              <div class="blog-tags">
                <span class="blog-tag">Matematik</span>
                <span class="blog-tag">Geometri</span>
              </div>
              <a href="#" class="blog-read-more">
                <span>Devamını Oku</span>
                <img src="/assets/images/img_right.png" alt="Arrow" />
              </a>
            </div>
          </article>

          <article class="blog-card">
            <div class="blog-author">
              <img
                src="/assets/images/img_shape_36x38.png"
                alt="Author"
                class="blog-avatar"
              />
              <div>
                <div class="blog-author-info">Prof. Dr. Elif Koç</div>
                <div class="blog-date">10 Ocak 2025</div>
              </div>
            </div>
            <h3 class="blog-title">
              Diferansiyel Geometrinin Temel Prensipleri
            </h3>
            <p class="blog-excerpt">
              Diferansiyel geometri, modern matematiğin en önemli dallarından
              biridir. Bu yazıda temel kavramları ve uygulamalarını
              inceleyeceğiz...
            </p>
            <div class="blog-footer">
              <div class="blog-tags">
                <span class="blog-tag">Matematik</span>
                <span class="blog-tag">Geometri</span>
              </div>
              <a href="#" class="blog-read-more">
                <span>Devamını Oku</span>
                <img src="/assets/images/img_right.png" alt="Arrow" />
              </a>
            </div>
          </article>

          <article class="blog-card">
            <div class="blog-author">
              <img
                src="/assets/images/img_shape_36x38.png"
                alt="Author"
                class="blog-avatar"
              />
              <div>
                <div class="blog-author-info">Prof. Dr. Elif Koç</div>
                <div class="blog-date">10 Ocak 2025</div>
              </div>
            </div>
            <h3 class="blog-title">
              Diferansiyel Geometrinin Temel Prensipleri
            </h3>
            <p class="blog-excerpt">
              Diferansiyel geometri, modern matematiğin en önemli dallarından
              biridir. Bu yazıda temel kavramları ve uygulamalarını
              inceleyeceğiz...
            </p>
            <div class="blog-footer">
              <div class="blog-tags">
                <span class="blog-tag">Matematik</span>
                <span class="blog-tag">Geometri</span>
              </div>
              <a href="#" class="blog-read-more">
                <span>Devamını Oku</span>
                <img src="/assets/images/img_right.png" alt="Arrow" />
              </a>
            </div>
          </article>

          <article class="blog-card">
            <div class="blog-author">
              <img
                src="/assets/images/img_shape_36x38.png"
                alt="Author"
                class="blog-avatar"
              />
              <div>
                <div class="blog-author-info">Prof. Dr. Elif Koç</div>
                <div class="blog-date">10 Ocak 2025</div>
              </div>
            </div>
            <h3 class="blog-title">
              Diferansiyel Geometrinin Temel Prensipleri
            </h3>
            <p class="blog-excerpt">
              Diferansiyel geometri, modern matematiğin en önemli dallarından
              biridir. Bu yazıda temel kavramları ve uygulamalarını
              inceleyeceğiz...
            </p>
            <div class="blog-footer">
              <div class="blog-tags">
                <span class="blog-tag">Matematik</span>
                <span class="blog-tag">Geometri</span>
              </div>
              <a href="#" class="blog-read-more">
                <span>Devamını Oku</span>
                <img src="/assets/images/img_right.png" alt="Arrow" />
              </a>
            </div>
          </article>

          <article class="blog-card">
            <div class="blog-author">
              <img
                src="/assets/images/img_shape_36x38.png"
                alt="Author"
                class="blog-avatar"
              />
              <div>
                <div class="blog-author-info">Prof. Dr. Elif Koç</div>
                <div class="blog-date">10 Ocak 2025</div>
              </div>
            </div>
            <h3 class="blog-title">
              Diferansiyel Geometrinin Temel Prensipleri
            </h3>
            <p class="blog-excerpt">
              Diferansiyel geometri, modern matematiğin en önemli dallarından
              biridir. Bu yazıda temel kavramları ve uygulamalarını
              inceleyeceğiz...
            </p>
            <div class="blog-footer">
              <div class="blog-tags">
                <span class="blog-tag">Matematik</span>
                <span class="blog-tag">Geometri</span>
              </div>
              <a href="#" class="blog-read-more">
                <span>Devamını Oku</span>
                <img src="/assets/images/img_right.png" alt="Arrow" />
              </a>
            </div>
          </article>
        </div>

        <div class="text-center">
          <button class="load-more-articles-btn">
            Daha Fazla Makale Yükle
          </button>
        </div>
      </div>
    </section>

    
    <section id="resources" class="resources-section" style="cursor: default">
    {{/*CURSOR KOYULDU*/}}
      <div class="container">
        <h2 class="section-title">Kaynaklar</h2>
        <p class="section-subtitle">
          Matematik ve bilgisayar bilimleri alanında ihtiyacınız olan tüm
          kaynaklara buradan ulaşabilirsiniz.
        </p>

        <div class="resources-grid">
          <div class="resource-card">
            <div class="resource-icon">
              <img
                src="/assets/images/img_book.png"
                alt="Book"
                style="cursor: pointer"
              />
              
            </div>
            <h3 class="resource-title" style="cursor: pointer">Ders Notları</h3>
            
            <p class="resource-description">
              Matematik ve bilgisayar bilimleri derslerine ait kapsamlı notlar
            </p>
          </div>

          <div class="resource-card">
            <div class="resource-icon">
              <img
                src="/assets/images/img_source_code.png"
                alt="Code"
                style="cursor: pointer"
              />
              {{/*CURSOR KOYULDU*/}}
            </div>
            <h3 class="resource-title" style="cursor: pointer">
              Yazılım Geliştirme
            </h3>
            {{/*CURSOR KOYULDU*/}}
            <p class="resource-description">
              Programlama dilleri, framework'ler ve geliştirme araçları
            </p>
          </div>

          <div class="resource-card">
            <div class="resource-icon">
              <img
                src="/assets/images/img_opened_folder.png"
                alt="Folder"
                style="cursor: pointer"
              />
              {{/*CURSOR KOYULDU*/}}
            </div>
            <h3 class="resource-title" style="cursor: pointer">
              Diğer Kaynaklar
            </h3>
            {{/*CURSOR KOYULDU*/}}
            <p class="resource-description">
              Araştırma makaleleri, rehberler ve ek materyaller
            </p>
          </div>
        </div>

        <p class="resources-note">
          Tüm kaynaklar topluluk üyeleri tarafından düzenli olarak
          güncellenmektedir.
        </p>
      </div>
    </section>

    {{/* Team Section */}}
    <section class="team-section" style="cursor: default">
    {{/*CURSOR KOYULDU*/}}
      <div class="container">
        <h2 class="section-title">Ekibimizle Tanışın</h2>
        <p class="section-subtitle">
          MACS topluluğunu yöneten deneyimli ve tutkulu, matematik ve bilgisayar
          bilimleri alanında yenilikçi projeler geliştiren ekibimiz.
        </p>

        <div class="team-grid">
          <div class="team-member">
            <div class="member-avatar" style="cursor: pointer"></div>
            {{/*CURSOR KOYULDU*/}}
            <h3 class="member-name">Berke Zerelgil</h3>
            <p class="member-role">Kulüp Başkanı</p>
            <p class="member-department">
              Matematik ve Bilgisayar Bilimleri 3. Sınıf
            </p>
            <p class="member-bio">
              Designer ve Uygulama Geliştirme odaklı, MACS kulübü ekip lideri
            </p>
            <div class="member-social">
              <img src="/assets/images/img_linkedin.png" alt="LinkedIn" />
              <img src="/assets/images/img_github_18x17.png" alt="GitHub" />
              <img
                src="/assets/images/img_instagram_circle.png"
                alt="Instagram"
              />
              <img src="/assets/images/img_email.png" alt="Email" />
            </div>
          </div>

          <div class="team-member">
            <div class="member-avatar" style="cursor: pointer"></div>
            {{/*CURSOR KOYULDU*/}}
            <h3 class="member-name">Berke Zerelgil</h3>
            <p class="member-role">Kulüp Başkanı</p>
            <p class="member-department">
              Matematik ve Bilgisayar Bilimleri 3. Sınıf
            </p>
            <p class="member-bio">
              Designer ve Uygulama Geliştirme odaklı, MACS kulübü ekip lideri
            </p>
            <div class="member-social">
              <img src="/assets/images/img_linkedin.png" alt="LinkedIn" />
              <img src="/assets/images/img_github_18x17.png" alt="GitHub" />
              <img
                src="/assets/images/img_instagram_circle.png"
                alt="Instagram"
              />
              <img src="/assets/images/img_email.png" alt="Email" />
            </div>
          </div>

          <div class="team-member">
            <div class="member-avatar" style="cursor: pointer"></div>
            {{/*CURSOR KOYULDU*/}}
            <h3 class="member-name">Berke Zerelgil</h3>
            <p class="member-role">Kulüp Başkanı</p>
            <p class="member-department">
              Matematik ve Bilgisayar Bilimleri 3. Sınıf
            </p>
            <p class="member-bio">
              Designer ve Uygulama Geliştirme odaklı, MACS kulübü ekip lideri
            </p>
            <div class="member-social">
              <img src="/assets/images/img_linkedin.png" alt="LinkedIn" />
              <img src="/assets/images/img_github_18x17.png" alt="GitHub" />
              <img
                src="/assets/images/img_instagram_circle.png"
                alt="Instagram"
              />
              <img src="/assets/images/img_email.png" alt="Email" />
            </div>
          </div>

          <div class="team-member">
            <div class="member-avatar" style="cursor: pointer"></div>
            {{/*CURSOR KOYULDU*/}}
            <h3 class="member-name">Berke Zerelgil</h3>
            <p class="member-role">Kulüp Başkanı</p>
            <p class="member-department">
              Matematik ve Bilgisayar Bilimleri 3. Sınıf
            </p>
            <p class="member-bio">
              Designer ve Uygulama Geliştirme odaklı, MACS kulübü ekip lideri
            </p>
            <div class="member-social">
              <img src="/assets/images/img_linkedin.png" alt="LinkedIn" />
              <img src="/assets/images/img_github_18x17.png" alt="GitHub" />
              <img
                src="/assets/images/img_instagram_circle.png"
                alt="Instagram"
              />
              <img src="/assets/images/img_email.png" alt="Email" />
            </div>
          </div>

          <div class="team-member">
            <div class="member-avatar" style="cursor: pointer"></div>
            {{/*CURSOR KOYULDU*/}}
            <h3 class="member-name">Berke Zerelgil</h3>
            <p class="member-role">Kulüp Başkanı</p>
            <p class="member-department">
              Matematik ve Bilgisayar Bilimleri 3. Sınıf
            </p>
            <p class="member-bio">
              Designer ve Uygulama Geliştirme odaklı, MACS kulübü ekip lideri
            </p>
            <div class="member-social">
              <img src="/assets/images/img_linkedin.png" alt="LinkedIn" />
              <img src="/assets/images/img_github_18x17.png" alt="GitHub" />
              <img
                src="/assets/images/img_instagram_circle.png"
                alt="Instagram"
              />
              <img src="/assets/images/img_email.png" alt="Email" />
            </div>
          </div>

          <div class="team-member">
            <div class="member-avatar" style="cursor: pointer"></div>
            {{/*CURSOR KOYULDU*/}}
            <h3 class="member-name">Berke Zerelgil</h3>
            <p class="member-role">Kulüp Başkanı</p>
            <p class="member-department">
              Matematik ve Bilgisayar Bilimleri 3. Sınıf
            </p>
            <p class="member-bio">
              Designer ve Uygulama Geliştirme odaklı, MACS kulübü ekip lideri
            </p>
            <div class="member-social">
              <img src="/assets/images/img_linkedin.png" alt="LinkedIn" />
              <img src="/assets/images/img_github_18x17.png" alt="GitHub" />
              <img
                src="/assets/images/img_instagram_circle.png"
                alt="Instagram"
              />
              <img src="/assets/images/img_email.png" alt="Email" />
            </div>
          </div>
        </div>

        <div class="text-center">
          <a href="#" class="view-more-team">
            <span>Daha fazla</span>
            <img src="/assets/images/img_vector.svg" alt="Arrow" />
          </a>
        </div>
      </div>
    </section>

    {{/* About Section */}}
    <section id="about" class="about-section" style="cursor: default">
    {{/*CURSOR KOYULDU*/}}
      <div class="container">
        <h2 class="section-title">Hakkımızda</h2>
        <p class="about-description">
          MACS; matematik, bilgisayar bilimi ve teknolojiye ilgi duyan
          öğrencileri bir araya getiren öğrenci odaklı bir topluluktur.Amacımız,
          sınıf ortamının ötesine geçen, ilham verici ve iş birliğine açık bir
          öğrenme alanı oluşturmaktır. Uygulamalı atölyelerden vizyon açıcı
          seminerlere kadar birçok etkinlikle, fikirlerin gerçeğe dönüştüğü bir
          alan sunuyoruz.
        </p>

        <div class="mission-card">
          <h3 class="mission-title">Misyonumuz</h3>
          <p class="mission-text">
            Misyonumuz; akademik bilgi ile gerçek dünya uygulamaları arasındaki
            köprüyü kurarak sürekli öğrenme, yaratıcılık ve ekip çalışmasını
            teşvik eden bir kültür oluşturmaktır. Öğrencileri matematik ve
            bilgisayar biliminin dinamik dünyasını keşfetmeye, güçlü bağlar
            kurmaya ve birlikte teknolojik yenilikler üretmeye teşvik ediyoruz.
          </p>
        </div>

        <div class="values-card">
          <h3 class="values-title">Değerlerimiz</h3>
          <div class="values-grid">
            <div class="value-item">
              <div class="value-header">
                <img
                  src="/assets/images/img_people_25x27.png"
                  alt="Community"
                  class="value-icon"
                />
                <span class="value-name">Topluluk</span>
              </div>
              <p class="value-description">
                MACS kendini ait ve güvende hissedebileceğin, destekleyici bir
                ortam ve birlikte büyüdüğümüz bir topluluktur.
              </p>
            </div>

            <div class="value-item">
              <div class="value-header">
                <img
                  src="/assets/images/img_graduation_cap.png"
                  alt="Learning"
                  class="value-icon"
                />
                <span class="value-name">Öğrenme</span>
              </div>
              <p class="value-description">
                Merak ederiz, araştırırız ve paylaşırız. Her etkinlikte
                birbirimizden öğrenmeye önem veririz.
              </p>
            </div>

            <div class="value-item">
              <div class="value-header">
                <img
                  src="/assets/images/img_innovation.png"
                  alt="Innovation"
                  class="value-icon"
                />
                <span class="value-name">Yenilik</span>
              </div>
              <p class="value-description">
                Yeni fikirlere açığız. Denemekten korkmadan, yaratıcılığı
                destekleriz.
              </p>
            </div>

            <div class="value-item">
              <div class="value-header">
                <img
                  src="/assets/images/img_handshake.png"
                  alt="Collaboration"
                  class="value-icon"
                />
                <span class="value-name">İş Birliği</span>
              </div>
              <p class="value-description">
                Birlikte üretmenin gücüne inanırız. Ekip çalışmasıyla daha büyük
                işler başarırız.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    {{/*footer Section */}}
    <footer id="contact" class="footer">
      <div class="container">
        <div class="footer-content">
          <div class="footer-section">
            <h3>MACS</h3>
            <p>Matematik ve Bilgisayar Bilimleri Topluluğu</p>
          </div>

          <div class="footer-section">
            <h3>Hızlı Linkler</h3>
            <ul class="footer-links">
              <li><a href="#events">Etkinlikler</a></li>
              <li><a href="#projects">Projeler</a></li>
              <li><a href="#blog">Blog</a></li>
              <li><a href="#resources">Kaynaklar</a></li>
            </ul>
          </div>

          <div class="footer-section">
            <h3>İletişim</h3>
            <div class="contact-info">
              <div class="contact-item">
                <img src="/assets/images/img_mail.png" alt="Email" />
                <span>info@macs.edu.tr</span>
              </div>
              <div class="contact-item">
                <img src="/assets/images/img_phone.png" alt="Phone" />
                <span>+90 538 329 6386</span>
              </div>
            </div>
          </div>

          <div class="footer-section">
            <h3>Sosyal Medya</h3>
            <div class="social-links">
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

        <div class="footer-divider"></div>

        <div class="footer-bottom">
          <img src="/assets/images/img_copyright.png" alt="Copyright" />
          <span>2025 MACS. Tüm hakları saklıdır.</span>
        </div>
      </div>
    </footer>
    </>
  );
};

export default HomePage;
