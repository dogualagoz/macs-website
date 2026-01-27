/**
 * ProjectsSection Component
 * 
 * Displays a slider of community projects featuring:
 * - Project slider with navigation
 * - Project descriptions
 * - Technology tags
 * - GitHub links
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ProjectSlider, FeaturedProjectCard } from '../../../shared/components/ui';
import '../../../styles/components/projects.css';

const ProjectsSection = ({ projects, categories, featuredProject }) => {
  const [activeFilter, setActiveFilter] = useState(null);

  const filteredProjects = activeFilter
    ? projects.filter(p => p.category_id === activeFilter)
    : projects;

  const showFeatured = !activeFilter && featuredProject;
  const sliderProjects = showFeatured
    ? filteredProjects.filter(project => project.id !== featuredProject.id)
    : filteredProjects;

  return (
    <section className="projects-section" id="projects">
      <div className="projects-container">
        {/* Section header */}
        <h2 className="section-title">Projeler</h2>
        <p className="section-description">
          Matematik ve bilgisayar bilimleri alanında geliştirdiğimiz yenilikçi projeler ve araştırmalarımız.
        </p>

        {/* Filtreler */}
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

        {/* Featured Project Card */}
        {showFeatured && (
          <div className="projects-featured-card">
            <FeaturedProjectCard
              title={featuredProject.title}
              description={featuredProject.description}
              image={featuredProject.image_url || featuredProject.image}
              technologies={featuredProject.technologies}
              githubUrl={featuredProject.github_url}
              liveUrl={featuredProject.live_url}
              slug={featuredProject.slug}
            />
          </div>
        )}

        {/* Project Slider */}
        <ProjectSlider
          projects={sliderProjects}
        />

        {/* View all projects link */}
        <div className="projects-cta">
          <Link to="/projeler" className="all-projects-button">Tüm Projeler</Link>
        </div>
      </div>
    </section>
  );
};

export default ProjectsSection; 