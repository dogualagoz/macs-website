/**
 * ProjectsSection Component
 * 
 * Displays a grid of community projects featuring:
 * - Project cards with images
 * - Project descriptions
 * - Technology tags
 * - GitHub links
 */
import React, { useState, useEffect } from 'react';
import { ProjectCard, FeaturedProjectCard } from '../projects';
import { fetchProjects, fetchFeaturedProject, fetchProjectCategories } from '../../services/api';
import '../../styles/components/projects.css';

const ProjectsSection = () => {
  // State for projects data and loading
  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [featuredProject, setFeaturedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);

  // Fetch projects and categories when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [projectsData, categoriesData, featuredProjectData] = await Promise.all([
          fetchProjects(),
          fetchProjectCategories(),
          fetchFeaturedProject()
        ]);
        setProjects(projectsData.projects || projectsData);
        setCategories(categoriesData);
        setFeaturedProject(featuredProjectData);
        setError(null);
      } catch (err) {
        setError('Veriler yüklenirken bir hata oluştu');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter projects based on selected category
  const filteredProjects = activeFilter
    ? projects.filter(project => project.category_id === activeFilter)
    : projects;

  if (loading) return <div className="projects-section loading">Yükleniyor...</div>;
  if (error) return <div className="projects-section error">{error}</div>;

  return (
    <section className="projects-section" id="projects">
      <div className="projects-container">
        {/* Section header */}
        <h2 className="section-title">Projeler</h2>
        <p className="section-description">
          Matematik ve bilgisayar bilimleri alanında geliştirdiğimiz yenilikçi projeler ve araştırmalarımız.
        </p>

        {/* Filtreler - Öne çıkan projenin üstünde */}
        <div className="Buttonss">
          <div className="Buttons">
            <button 
              className={`button ${!activeFilter ? 'active' : ''}`}
              onClick={() => setActiveFilter(null)}
            >
              Tümü
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                className={`button ${activeFilter === category.id ? 'active' : ''}`}
                onClick={() => setActiveFilter(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
        <br />

        {/* Öne Çıkan Proje - FeaturedProjectCard bileşeni */}
        {featuredProject && (
          <FeaturedProjectCard
            title={featuredProject.title}
            description={featuredProject.description}
            image={featuredProject.image_url}
            technologies={featuredProject.technologies}
            githubUrl={featuredProject.github_url}
            liveUrl={featuredProject.live_url}
          />
        )}

        {/* Diğer Projeler - Featured project hariç */}
        <div className="projects-grid">
          {filteredProjects
            .filter(project => project.id !== featuredProject?.id) // Featured project'i çıkar
            .map(project => (
            <ProjectCard 
              key={project.id}
              title={project.title}
              description={project.description}
              image={project.image_url}
              technologies={project.technologies}
              teamMembers={project.team_members}
              category={project.category?.name}
            />
          ))}
        </div>

        {/* View all projects link */}
        <div className="projects-cta">
          <a 
            href="https://github.com/macsclub" 
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