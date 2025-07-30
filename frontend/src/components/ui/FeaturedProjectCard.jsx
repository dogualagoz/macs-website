/**
 * FeaturedProjectCard Component
 * 
 * Displays a featured project card with larger size and prominent styling.
 * Similar to ProjectCard but with different CSS classes for featured appearance.
 */
import React from 'react';
import PropTypes from 'prop-types';

const FeaturedProjectCard = ({ title, description, image, technologies, githubUrl, liveUrl }) => {
  // Technologies string'ini virgülle ayır
  const techArray = technologies ? technologies.split(',').map(tech => tech.trim()) : [];

  // CSS'teki teknoloji sınıflarını kullan
  const techClasses = ['Python', 'TensorFlow', 'React', 'MachineLearn'];

  return (
    <div className="First-2">
      <div className="Image-container">
        <img className='First-img' src={image || "assets/images/img_source_code.png"} alt={title} />
      </div>
      <div className="Details-Container">
        <div className="First-come">
          <img src="assets/images/img_star.png" alt="" className="First-come-img" />
          <span className="First-come-span">Öne Çıkan</span>
        </div>
        
        <div className="Details-tittle">
          {title}
        </div>
        
        <div className="Details-subtittle">
          {description}
        </div>
        
        {/* Technology tags - CSS'teki sınıfları kullan */}
        {techArray.map((tech, index) => {
          const className = techClasses[index] || 'Python'; // Fallback
          return (
            <div key={index} className={className}>
              {tech}
            </div>
          );
        })}
        
        <div className="Detail-Project">
          <button className='Detail-Project-button'>
            <img className='Project-icon' src="assets/images/img_linking.png" alt="github" />
            Projeyi İncele
          </button>
        </div>
        
        <div className="Git-div">
          <button className="Git-button">
            <img src="assets/images/img_github_18x17.png" alt="Github" className="Git-img" />
            <span className="Git-span">Git Hub</span>
          </button>
        </div>
      </div>
    </div>
  );
};

FeaturedProjectCard.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  image: PropTypes.string,
  technologies: PropTypes.string,
  githubUrl: PropTypes.string,
  liveUrl: PropTypes.string
};

export default FeaturedProjectCard; 