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
    title: "MACS Mobile App",
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
        <h2 className="section-title">Projeler</h2>
        <p className="section-description">
          Matematik ve bilgisayar bilimleri alanında geliştirdiğimiz yenilikçi projeler ve araştırmalarımız.
        </p>
        {/* sonradan yapıldı backende bağlanmadı*/}
        <div className="First-2">
          <div className="Image-container">
            {/* <img className='First-img' src="assets/images/turkhavayollari.jpg" alt="" /> */}
          </div>
          <div className="Details-Container">
            <div className="First-come">
              <img src="assets/images/img_star.png" alt="" className="First-come-img" />
              <span className="First-come-span">Öne Çıkan</span>
              </div>
              <div className="Details-tittle">
                Yapay Zeka Destekli Öğrenme Platformu
                </div>
                <div className="Details-subtittle">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud 
                </div>
                <div className="Python">
                    Python
                  </div>
                  <div className="TensorFlow">
                    TensorFlow
                  </div>
                  <div className="React">
                    React
                  </div>
                  <div className="MachineLearn">
                    Machine Learn
                  </div>
                  <div className="Detail-Project">
                    <button className='Detail-Project-button'>
                      <img className='Project-icon' src="assets/images/img_linking.png" alt="github" />
                      Projeyi İncele
                    </button>
                  </div>
                  <div className="Git-div">
                    <button className="Git-button">
                      <img src="assets/images/img_github_18x17.png" alt="Github" className="Git-img"></img>
                      <span className="Git-span">Git Hub</span>
                    </button>
                </div>
          </div>
        </div>
        <div className="Buttonss">
          <div className="Buttons">
            <button className='button'>Tümü</button>
          <button className='button'>Web Geliştirme</button>
          <button className='button'>Yapay Zeka</button>
          <button className='button'>Mobil Uygulama</button>
          <button className='button'>Matematik</button>
          <button className='button'>Araştırma</button>
          </div>
        </div>
        <br />
      {/* sonradan yapıldı backende bağlanmadı*/}
        <div className="projects-grid">
          {PROJECTS_DATA.map(project => (
            <div key={project.id} className="project-card">
              {/* Project image */}
              <div className="project-image">
                <img src={project.image} alt={project.title} />
              </div>

              {/* Project details */}
              <div className="project-content">
                <div className="head">
                  <img src="assets/images/img_source_code.png" alt="html"></img>
                <span>Web Geliştirme</span>
                </div>
                <h3 className="project-title">{project.title}</h3>
                <p className="project-description">{project.description}</p>

                {/* Technology tags */}
                <div className="project-technologies">
                  {project.technologies.map(tech => (
                    <span key={tech} className="tech-tag">{tech}</span>
                  ))}
                </div>
                <div className="AyseYildiz">
                  <img src="assets/images/img_shape_36x38.png" alt="ayse yildiz" />
                  <span>Ayşe Yıldız</span>
                </div>
                <div className="go">
                  <img src="assets/images/img_vector.svg" alt="devam" />
                </div>
              
              

                {/* GitHub link
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
                </div> */}
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