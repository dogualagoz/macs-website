/**
 * ProjectsSection Component
 * 
 * Displays a grid of community projects featuring:
 * - Project cards with images
 * - Project descriptions
 * - Technology tags
 * - GitHub links
 */
import React from 'react';
import '../../styles/components/projects.css';

// Sample project data (TODO: Replace with API call)
const PROJECTS_DATA = [
  {
    id: 1,
    title: "MACS Web Sitesi",
    description: "Topluluğumuzun resmi web sitesi. React ve FastAPI kullanılarak geliştirildi.",
    image: "/assets/images/img_source_code.png",
    technologies: ["React", "FastAPI", "PostgreSQL"],
    github: "https://github.com/macs/website"
  },
  {
    id: 2,
    title: "Etkinlik Yönetim Sistemi",
    description: "Etkinlik kayıt ve katılım takip sistemi.",
    image: "/assets/images/img_calender.png",
    technologies: ["Node.js", "Express", "MongoDB"],
    github: "https://github.com/macs/event-management"
  },
  {
    id: 3,
    title: "MACsdS Mobile App",
    description: "Topluluğumuzun mobil uygulaması. Flutter ile geliştirildi.",
    image: "/assets/images/img_innovation.png",
    technologies: ["Flutter", "Dart", "Firebase"],
    github: "https://github.com/macs/mobile-app"
  }
];

const ProjectsSection = () => {
  return (
    <section className="projects-section" id="projects">
      <div className="projects-container">
        {/* Section header */}
        <h2 className="section-title">Projelerimiz</h2>
        <p className="section-description">
          Topluluğumuz tarafından geliştirilen açık kaynak projeler
        </p>

        {/* Projects grid */}
        <div className="projects-grid">
          {PROJECTS_DATA.map(project => (
            <div key={project.id} className="project-card">
              {/* Project image */}
              <div className="project-image">
                <img src={project.image} alt={project.title} />
              </div>

              {/* Project details */}
              <div className="project-content">
                <h3 className="project-title">{project.title}</h3>
                <p className="project-description">{project.description}</p>

                {/* Technology tags */}
                <div className="project-technologies">
                  {project.technologies.map(tech => (
                    <span key={tech} className="tech-tag">{tech}</span>
                  ))}
                </div>

                {/* GitHub link */}
                <div className="project-links">
                  <a 
                    href={project.github} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="github-link"
                  >
                    <img src="/assets/images/img_github.png" alt="GitHub" />
                    GitHub'da İncele
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View all projects link */}
        <div className="projects-cta">
          <a 
            href="https://github.com/macs" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="all-projects-button"
          >
            Tüm Projeler
          </a>
        </div>
      </div>
    </section>
  );
};

export default ProjectsSection; 