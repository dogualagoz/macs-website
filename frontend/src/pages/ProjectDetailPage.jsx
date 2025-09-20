import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Share2,
  ArrowLeft,
  CheckCircle2
} from "lucide-react";
import { useParams } from "react-router-dom";
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


// Parse team members from project.team_members string
const teamMembers = project.team_members 
  ? project.team_members.split(',').map(name => name.trim()).filter(name => name)
  : [];





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

            <Section title="Proje Ekibi">
              <div className="project-detail-teamList">
                {teamMembers.length > 0 ? (
                  teamMembers.map((memberName, i) => (
                    <div key={i} className="project-detail-teamCard">
                      <div className="project-detail-teamName">{memberName}</div>
                    </div>
                  ))
                ) : (
                  <p>Proje ekibi bilgisi mevcut değil.</p>
                )}
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
