import React, { useState, useEffect } from 'react';
import { GraduationCap, Lightbulb, Handshake, Target, Heart, Sparkles, Rocket, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import '../../../styles/pages/about.css';
import SEO from '../../../shared/components/seo/SEO';
import TeamSection from '../../home/components/TeamSection';
import Loading from '../../../shared/components/feedback/Loading';

// =====================================================
// EMEĞİ GEÇENLER - Web Sitesi Geliştirme Ekibi
// Yeni üye eklemek için aşağıdaki formatta nesne ekleyin
// =====================================================
const websiteTeam = [
  {
    id: 1,
    ad_soyad: "Doğu Alagöz",
    rol: "Project Manager",
    profil_resmi: "/assets/images/profiles/dogupp.jpeg"
  },
  {
    id: 2,
    ad_soyad: "Enes Dursun",
    rol: "Frontend Developer",
    profil_resmi: "/assets/images/profiles/placeholder.jpg"
  },
  {
    id: 3,
    ad_soyad: "Berke Zerelgil",
    rol: "UI/UX Designer",
    profil_resmi: "/assets/images/profiles/berkepp.jpeg"
  },
  {
    id: 4,
    ad_soyad: "Leyla Mammadova",
    rol: "Frontend Developer",
    profil_resmi: "/assets/images/profiles/leylapp.jpg"
  },
  {
    id: 5,
    ad_soyad: "Yusuf Efe Taşdelen",
    rol: "Frontend Developer",
    profil_resmi: "/assets/images/profiles/yusufpp.jpg"
  },
  {
    id: 6,
    ad_soyad: "Eren Alpaslan",
    rol: "Tester",
    profil_resmi: "/assets/images/profiles/erenpp.jpeg"
  }
];

// Scroll animasyon varyantları
const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

const fadeInRight = {
  hidden: { opacity: 0, x: 60 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1
    }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

const AboutPage = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <SEO 
        title="Hakkımızda - MACS"
        description="MACS, Eskişehir Osmangazi Üniversitesi Matematik ve Bilgisayar Bilimleri Bölümü öğrencilerinin kurduğu, yazılım projeleri ve etkinlikler düzenleyen aktif bir öğrenci topluluğudur."
        keywords="MACS, Hakkımızda, Matematik, Bilgisayar Bilimleri, ESOGÜ, topluluk"
        url="https://esogumacs.com/hakkimizda"
      />
      
      <AnimatePresence mode="wait">
        {loading ? (
          <Loading variant="light" />
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="about-page">
              {/* Hero Section */}
              <section className="about-hero">
                <motion.div 
                  className="about-hero-content"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  <div className="about-hero-badge">
                    <Sparkles size={16} />
                    <span>Öğrenci Topluluğu</span>
                  </div>
                  <h1 className="about-hero-title">
                    <span className="text-gradient">MACS</span> Topluluğu
                  </h1>
                  <p className="about-hero-subtitle">
                    Matematik ve Bilgisayar Bilimleri tutkusuyla bir araya gelen öğrencilerin 
                    oluşturduğu, yenilikçi ve dinamik bir topluluk.
                  </p>
                </motion.div>
                <div className="about-hero-decoration">
                  <div className="decoration-circle circle-1"></div>
                  <div className="decoration-circle circle-2"></div>
                  <div className="decoration-circle circle-3"></div>
                </div>
              </section>

              {/* About Content */}
              <section className="about-content">
                <div className="about-container">
                  
                  {/* Biz Kimiz */}
                  <motion.div 
                    className="about-intro-card"
                    variants={fadeInUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                  >
                    <div className="about-intro-logo">
                      <img src="/assets/images/img_exclude.png" alt="MACS Logo" />
                    </div>
                    <div className="about-intro-text">
                      <h2>Biz Kimiz?</h2>
                      <p>
                        MACS; matematik, bilgisayar bilimi ve teknolojiye ilgi duyan öğrencileri 
                        bir araya getiren öğrenci odaklı bir topluluktur. Amacımız, sınıf ortamının 
                        ötesine geçen, ilham verici ve iş birliğine açık bir öğrenme alanı oluşturmaktır.
                      </p>
                      <p>
                        Uygulamalı atölyelerden vizyon açıcı seminerlere kadar birçok etkinlikle, 
                        fikirlerin gerçeğe dönüştüğü bir alan sunuyoruz. Eskişehir Osmangazi Üniversitesi'nde 
                        faaliyet gösteren topluluğumuz, öğrencilerin potansiyellerini keşfetmelerine 
                        ve geliştirmelerine yardımcı olmaktadır.
                      </p>
                    </div>
                  </motion.div>

                  {/* Misyon & Vizyon */}
                  <motion.div 
                    className="about-mission-vision"
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                  >
                    <motion.div className="mission-card" variants={fadeInLeft}>
                      <div className="card-icon">
                        <Target size={28} />
                      </div>
                      <h3>Misyonumuz</h3>
                      <p>
                        Akademik bilgi ile gerçek dünya uygulamaları arasındaki köprüyü kurarak 
                        sürekli öğrenme, yaratıcılık ve ekip çalışmasını teşvik eden bir kültür 
                        oluşturmaktır. Öğrencileri matematik ve bilgisayar biliminin dinamik 
                        dünyasını keşfetmeye, güçlü bağlar kurmaya ve birlikte teknolojik 
                        yenilikler üretmeye teşvik ediyoruz.
                      </p>
                    </motion.div>
                    <motion.div className="vision-card" variants={fadeInRight}>
                      <div className="card-icon">
                        <Rocket size={28} />
                      </div>
                      <h3>Vizyonumuz</h3>
                      <p>
                        Türkiye'nin önde gelen teknik toplulukları arasında yer almak ve 
                        üyelerimizi sektörün aranan profesyonelleri haline getirmek. 
                        Yenilikçi projeler ve güçlü bir network ile öğrenci topluluklarına 
                        ilham kaynağı olmak.
                      </p>
                    </motion.div>
                  </motion.div>

                  {/* Değerlerimiz */}
                  <motion.div 
                    className="about-values-section"
                    variants={fadeInUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                  >
                    <div className="section-header">
                      <Heart size={24} className="section-icon" />
                      <h2>Değerlerimiz</h2>
                    </div>
                    <motion.div 
                      className="values-grid"
                      variants={staggerContainer}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true, amount: 0.2 }}
                    >
                      <motion.div className="value-card" variants={scaleIn}>
                        <div className="value-icon-wrapper">
                          <Users size={24} />
                        </div>
                        <h4>Topluluk</h4>
                        <p>
                          MACS kendini ait ve güvende hissedebileceğin, destekleyici bir 
                          ortam ve birlikte büyüdüğümüz bir topluluktur.
                        </p>
                      </motion.div>

                      <motion.div className="value-card" variants={scaleIn}>
                        <div className="value-icon-wrapper">
                          <GraduationCap size={24} />
                        </div>
                        <h4>Öğrenme</h4>
                        <p>
                          Merak ederiz, araştırırız ve paylaşırız. Her etkinlikte 
                          birbirimizden öğrenmeye önem veririz.
                        </p>
                      </motion.div>

                      <motion.div className="value-card" variants={scaleIn}>
                        <div className="value-icon-wrapper">
                          <Lightbulb size={24} />
                        </div>
                        <h4>Yenilik</h4>
                        <p>
                          Yeni fikirlere açığız. Denemekten korkmadan, yaratıcılığı 
                          destekleriz.
                        </p>
                      </motion.div>

                      <motion.div className="value-card" variants={scaleIn}>
                        <div className="value-icon-wrapper">
                          <Handshake size={24} />
                        </div>
                        <h4>İş Birliği</h4>
                        <p>
                          Birlikte üretmenin gücüne inanırız. Ekip çalışmasıyla daha büyük 
                          işler başarırız.
                        </p>
                      </motion.div>
                    </motion.div>
                  </motion.div>

                  {/* Yönetim Ekibi */}
                  <motion.div
                    variants={fadeInUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.1 }}
                  >
                    <TeamSection />
                  </motion.div>

                  {/* İstatistikler */}
                    <motion.div className="about-stats" 
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                  >
                    <motion.div className="stat-item" variants={scaleIn}>
                      <span className="stat-number">50+</span>
                      <span className="stat-label">Aktif Üye</span>
                    </motion.div>
                    <motion.div className="stat-item" variants={scaleIn}>
                      <span className="stat-number">4+</span>
                      <span className="stat-label">Tamamlanan Proje</span>
                    </motion.div>
                    <motion.div className="stat-item" variants={scaleIn}>
                      <span className="stat-number">6+</span>
                      <span className="stat-label">Etkinlik</span>
                    </motion.div>
                    <motion.div className="stat-item" variants={scaleIn}>
                      <span className="stat-number">1+</span>
                      <span className="stat-label">Yıllık Deneyim</span>
                    </motion.div>
                  </motion.div>

                  {/* Emeği Geçenler */}
                  <motion.div 
                    className="about-team-section"
                    variants={fadeInUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                  >
                    <div className="section-header">
                      <Users size={24} className="section-icon" />
                      <h2>Emeği Geçenler</h2>
                    </div>
                    <p className="team-section-subtitle">
                      Bu web sitesinin geliştirilmesinde emeği geçen ekip üyelerimiz
                    </p>
                    <motion.div 
                      className="team-grid"
                      variants={staggerContainer}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true, amount: 0.2 }}
                    >
                      {websiteTeam.map((uye) => (
                        <motion.div 
                          className="team-card" 
                          key={uye.id}
                          variants={scaleIn}
                        >
                          <div className="team-avatar">
                            <img 
                              src={uye.profil_resmi} 
                              alt={uye.ad_soyad}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                          <h4 className="team-name">{uye.ad_soyad}</h4>
                          <span className="team-role">{uye.rol}</span>
                        </motion.div>
                      ))}
                    </motion.div>
                  </motion.div>

                  {/* CTA Section */}
                  <motion.div 
                    className="about-cta"
                    variants={fadeInUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.5 }}
                  >
                    <h2>Bize Katılmak İster Misiniz?</h2>
                    <p>
                      MACS ailesinin bir parçası olun ve teknoloji dünyasında yerinizi alın!
                    </p>
                    <a 
                      href="https://forms.gle/MXaCH1YG3qE4rsX36" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="cta-button"
                    >
                      <span>Başvuru Yap</span>
                      <Rocket size={18} />
                    </a>
                  </motion.div>
                </div>
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AboutPage;
