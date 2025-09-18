import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Share2,
  ArrowLeft,
  CheckCircle2
} from "lucide-react";
import { useParams, Link } from "react-router-dom";
import { fetchProjectBySlug } from "../services/api";
import { getImageUrl, handleImageError } from '../utils/imageUtils';
import '../styles/pages/ProjectDetail.css';


function Section({ title, children }) {
  return (
    <section className="project-detail-section">
      <h3 className="sectionTitle">{title}</h3>
      {children}
    </section>
  );
}

// ---------- Main Component ----------
const ProjectDetail = () => {
  const { slug } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // getImageUrl artık import edildi

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const found = await fetchProjectBySlug(slug);
        if (!found) setError("Proje bulunamadı");
        setProject(found || {});
      } catch (err) {
        console.error(err);
        setError("Proje yüklenirken bir hata oluştu");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

if (loading) 
  return (
    <div class="spinner center">
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
</div>
  );

 if (error) 
  return (
    <div className="error-container">
      <div className="error-icon">⚠️</div>
      <p>{error}</p>
      <button onClick={() => window.location.reload()}>Tekrar Dene</button>
    </div>
  );
  if (!project) return null;


const team = project.team || [
  { name: "Ali Veli", role: "Frontend Developer", avatar: "/assets/images/team1.jpg" },
  { name: "Ayşe Yılmaz", role: "Backend Developer", avatar: "/assets/images/team2.jpg" },
  { name: "Mehmet Kaya", role: "UI/UX Designer", avatar: "/assets/images/team3.jpg" },
  { name: "Zeynep Demir", role: "Project Manager", avatar: "/assets/images/team4.jpg" },
  { name: "Can Öztürk", role: "Mobile Developer", avatar: "/assets/images/team5.jpg" },
  { name: "Elif Arslan", role: "QA Engineer", avatar: "/assets/images/team6.jpg" },
  { name: "Murat Çelik", role: "DevOps Engineer", avatar: "/assets/images/team7.jpg" },
  { name: "Selin Aksoy", role: "Content Strategist", avatar: "/assets/images/team8.jpg" }
];


  const örnekDescription = `📌 Proje Açıklaması: MACS Websitesi

Proje Adı: MACS Official Website
Amaç: MACS kulübünü tanıtmak, etkinlikleri duyurmak ve üyeler arasında iletişimi kolaylaştırmak için modern, kullanıcı dostu ve dinamik bir web sitesi geliştirmek.

🎯 Hedefler

Kulüp hakkında genel bilgileri paylaşmak (vizyon, misyon, ekip).

Etkinlikleri ve duyuruları kolayca yayınlamak.

Üyeler için özel giriş sistemi sunmak.

Hava durumu, spor karşılaşmaları ve kripto para gibi ilgi çekici dinamik içerikler eklemek.

Modern, mobil uyumlu ve hızlı çalışan bir arayüz oluşturmak.

🛠️ Kullanılacak Teknolojiler

Frontend: React.js, TailwindCSS, Framer Motion (animasyonlar için)

Backend: Django veya Node.js (API servisleri için)

Veritabanı: PostgreSQL veya MongoDB

Diğer: GitHub (versiyon kontrolü), Figma (UI/UX tasarımı)

📑 Özellikler

Ana Sayfa: Kulübün kısa tanıtımı, son duyurular, öne çıkan etkinlikler.

Etkinlikler Sayfası: Takvim, geçmiş ve gelecek etkinlikler.

Üyelik Sistemi: Kullanıcı girişi, profil oluşturma, özel görev listesi.

Dinamik İçerikler: Hava durumu, kripto fiyatları, spor skorları.

İletişim: İletişim formu, sosyal medya bağlantıları.

👥 Ekip ve Roller

Frontend Geliştirici: Kullanıcı arayüzünü tasarlayıp geliştirecek.

Backend Geliştirici: API’leri ve veritabanı bağlantısını sağlayacak.

UI/UX Tasarımcı: Kullanıcı deneyimi ve tasarımı yönetecek.

Proje Yöneticisi: Görev dağılımı ve zaman yönetiminden sorumlu olacak.

📅 Zaman Çizelgesi

1. Hafta: Tasarım & planlama

2-3. Hafta: Frontend geliştirme

4-5. Hafta: Backend geliştirme ve veritabanı entegrasyonu

6. Hafta: Testler ve hata düzeltmeleri

7. Hafta: Yayına alma

🚀 Beklenen Sonuç

Kullanıcı dostu, hızlı, güvenli ve mobil uyumlu bir MACS web sitesi. Kulüp etkinliklerini dijital ortama taşıyarak üyeler ve takipçiler arasında daha güçlü bir iletişim kanalı sağlanacak.`;

  const  örnekFeatures = [
    {time: 1, title: "Planlama ve Analiz"},
    {time: 2, title: "Tasarım (UI/UX)"},
    {time: "3-4", title: "Frontend Geliştirme"},
    {time: "5-6", title: "Backend Geliştirme"},
    {time: 6, title: "Entegrasyon"},
    {time: 7, title: "Test Süreci"},
    {time: 8, title: "Yayına Alma (Deployment)"},
    {time: "Sürekli", title: "Bakım ve Güncellemeler"}
]


  return (
    <div className="project-detail-page">
      <div className="project-detail-container">
        {/* Back */}
        <div onClick={() => window.history.back()} className="project-detail-backBtn">
          <ArrowLeft size={16} /> Geri Dön
        </div>

        {/* Hero */}
        <div className="project-detail-hero">
          <motion.img
            src={getImageUrl(project.image_url) || "/assets/images/img_source_code.png"}
            alt={project.title || "Proje"}
            className="project-detail-heroImage"
            onError={(e) => handleImageError(e)}
            initial={{ scale: 1.06, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.9 }}
          />
          <div className="project-detail-heroText">
            <motion.h1
              className="project-detail-heroTitle"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              {project.title || "Proje Başlığı"}
            </motion.h1>
            <p className="project-detail-heroSubtitle">{project.subtitle || project.description || ""}</p>
            
            {/* Technology Tags */}
            {project.technologies && (
              <div className="project-detail-techTags">
                {project.technologies.split(',').filter(tech => tech.trim()).map(tech => (
                  <span key={tech.trim()} className="tech-tag">{tech.trim()}</span>
                ))}
              </div>
            )}
            
            <div className="project-detail-heroButtons">
              {project.github_url && (
                <a href={project.github_url} target="_blank" rel="noreferrer" className="project-detail-buttonPrimary">
                  GitHub
                </a>
              )}
              {project.live_url && (
                <a href={project.live_url} target="_blank" rel="noreferrer" className="project-detail-buttonPrimary">
                  Canlı Demo
                </a>
              )}
              <button className="project-detail-buttonSecondary">
                <Share2 size={14} /> Paylaş
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="project-detail-contentFlex">
          <div className="project-detail-leftColumn">
            <Section title="Proje Açıklaması">
              <p>{project.content || "-"}</p>
              <div className="project-detail-perkList">
                {(project.features || []).map((f, i) => (
                  <div key={i} className="project-detail-perkItem">
                    <CheckCircle2 size={16} /> {f}
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Proje Aşamaları">
              {(project.stages || örnekFeatures).map((s, i) => (
                <div key={i} className="project-detail-stageItem">
                  <span className="project-detail-time">{s.time || "-"}</span>
                  <span>{s.title || "-"}</span>
                </div>
              ))}
            </Section>

            <Section title="Proje Ekibi">
              <div className="project-detail-teamList">
                {team.map((member, i) => (
                  <div key={i} className="project-detail-teamCard">
                    <img 
                      src={getImageUrl(member.avatar) || "/assets/images/img_shape.png"} 
                      alt={member.name}
                      onError={(e) => handleImageError(e)}
                    />
                    <div className="project-detail-teamName">{member.name}</div>
                    <div className="project-detail-teamRole">{member.role}</div>
                  </div>
                ))}
              </div>
            </Section>


          </div>

          {/* Right Card */}
          <div className="project-detail-rightColumn">
            {/* <Section title="Proje Bilgisi">
              <div className="project-detail-rightCardTop">
                <Users size={16} /> <span>Katılımcılar sınırlı</span>
              </div>
              <div className="project-detail-rightCardInfo">
                <div><CalendarDays size={14} /> {StartDate || "-"}</div>
                <div><Clock size={14} /> {StartDate} - {EndDate}</div>
                <div><MapPin size={14} /> {project.location || "-"}</div>
              </div>
              <button className="project-detail-buttonPrimary fullWidth">Projeyi Gör</button>
            </Section> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;
