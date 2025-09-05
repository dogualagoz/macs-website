/**
 * FeaturedProjectCard Component
 * 
 * Displays a featured project card with larger size and prominent styling.
 * Similar to ProjectCard but with different CSS classes for featured appearance.
 */
import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { getImageUrl, handleImageError } from '../../utils/imageUtils';

const FeaturedProjectCard = ({ title, description, image, technologies, githubUrl, liveUrl, slug }) => {
  // Technologies string'ini virgülle ayır
  const techArray = technologies ? technologies.split(',').map(tech => tech.trim()) : [];

  // CSS'teki teknoloji sınıflarını kullan
  const techClasses = ['Python', 'TensorFlow', 'React', 'MachineLearn'];
  
  // techArray ve techClasses değişkenleri korundu, getImageUrl artık import edildi

  return (
    <div className="First-2">
      <div className="Image-container">
        <img 
          className='First-img' 
          src={getImageUrl(image, '/assets/images/img_source_code.png')} 
          alt={title}
          onError={(e) => handleImageError(e, '/assets/images/img_source_code.png')}
        />
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
          {slug ? (
            <Link to={`/projeler/${slug}`} className='Detail-Project-button' style={{ textDecoration: 'none' }}>
              <img className='Project-icon' src="assets/images/img_linking.png" alt="detay" />
              Projeyi İncele
            </Link>
          ) : (
            <a href={liveUrl || '#'} className='Detail-Project-button' style={{ textDecoration: 'none' }}>
              <img className='Project-icon' src="assets/images/img_linking.png" alt="detay" />
              Projeyi İncele
            </a>
          )}
        </div>
        
        <div className="Git-div">
          {githubUrl ? (
            <a href={githubUrl} target="_blank" rel="noreferrer" className="Git-button" style={{ textDecoration: 'none' }}>
              <img src="assets/images/img_github_18x17.png" alt="Github" className="Git-img" />
              <span className="Git-span">Git Hub</span>
            </a>
          ) : (
            <div className="Git-button" style={{ opacity: 0.6 }}>
              <img src="assets/images/img_github_18x17.png" alt="Github" className="Git-img" />
              <span className="Git-span">Git Hub</span>
            </div>
          )}
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