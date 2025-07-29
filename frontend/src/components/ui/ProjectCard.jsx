/**
 * ProjectCard Component
 * 
 * Displays an individual project card with project details including:
 * - Project image and category
 * - Title and description
 * - Technology tags
 * - Team member information
 */
import React from 'react';
import PropTypes from 'prop-types';

const ProjectCard = ({ title, description, image, technologies, teamMembers, category }) => {
  // Technologies string'ini virgülle ayır
  const techArray = technologies ? technologies.split(',').map(tech => tech.trim()) : [];
  
  // Team members string'ini virgülle ayır ve ilk elemanı al
  const firstTeamMember = teamMembers ? teamMembers.split(',').map(member => member.trim())[0] : 'Ayşe Yıldız';

  return (
    <div className="project-card">
      {/* Project image */}
      <div className="project-image">
        <img src={image || "/assets/images/img_source_code.png"} alt={title} />
      </div>

      {/* Project details */}
      <div className="project-content">
        <div className="head">
          <img src="assets/images/img_source_code.png" alt="html" />
          <span>{category || "Web Geliştirme"}</span>
        </div>
        
        <h3 className="project-title">{title}</h3>
        <p className="project-description">{description}</p>

        {/* Technology tags */}
        <div className="project-technologies">
          {techArray.map(tech => (
            <span key={tech} className="tech-tag">{tech}</span>
          ))}
        </div>
        
        <div className="AyseYildiz">
          <img src="assets/images/img_shape_36x38.png" alt="team member" />
          <span>{firstTeamMember}</span>
        </div>
        
        <div className="go">
          <img src="assets/images/img_vector.svg" alt="devam" />
        </div>
      </div>
    </div>
  );
};

ProjectCard.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  image: PropTypes.string,
  technologies: PropTypes.string,
  teamMembers: PropTypes.string,
  category: PropTypes.string
};

export default ProjectCard; 