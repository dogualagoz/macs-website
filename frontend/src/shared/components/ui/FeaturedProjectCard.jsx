/**
 * FeaturedProjectCard Component
 * 
 * Displays a featured project card with larger size and prominent styling.
 * Similar to ProjectCard but with different CSS classes for featured appearance.
 */
import React from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate } from 'react-router-dom';
import { getImageUrl, handleImageError } from '../../../utils/imageUtils';

const FeaturedProjectCard = ({ title, description, image, technologies, githubUrl, liveUrl, slug }) => {
  // Technologies string'ini virgülle ayır
  const techArray = technologies ? technologies.split(',').map(tech => tech.trim()).filter(Boolean) : [];

  // getImageUrl artık import edildi

  const navigate = useNavigate();

  const handleCardClick = () => {
    if (slug) {
      navigate(`/projeler/${slug}`);
    }
  };

  const handleButtonClick = (e) => {
    e.stopPropagation(); // Butona tıklandığında kartın tıklanma olayını tetikleme
  };

  return (
    <div className="First-2" onClick={handleCardClick} style={{ cursor: 'pointer' }}>
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
          <span className="First-come-span">⭐ Öne Çıkan</span>
        </div>
      
        <div className="Details-tittle">
          {title}
        </div>
        
        <div className="Details-subtittle">
          {description}
        </div>
        
        <div className="tags">
          {techArray.map((tech, index) => (
            <div key={index} className="tag">
              {tech}
            </div>
          ))}
        </div>
        
        <div className="button-container">
          <div className="Detail-Project" onClick={handleButtonClick}>
            {slug ? (
              <Link to={`/projeler/${slug}`} className='Detail-Project-button' style={{ textDecoration: 'none' }}>
                <img className='Project-icon' src="/assets/images/img_linking.png" alt="detay" />
                Projeyi İncele
              </Link>
            ) : (
              <a href={liveUrl || '#'} className='Detail-Project-button' style={{ textDecoration: 'none' }}>
                <img className='Project-icon' src="assets/images/img_linking.png" alt="detay" />
                Projeyi İncele
              </a>
            )}
          </div>
          
          <div className="Git-div" onClick={handleButtonClick}>
            {githubUrl ? (
              <a href={githubUrl} target="_blank" rel="noreferrer" className="Git-button" style={{ textDecoration: 'none' }}>
                <img src="/assets/images/img_github_18x17.png" alt="Github" className="Git-img" />
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
    </div>
  );
};

FeaturedProjectCard.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  image: PropTypes.string,
  technologies: PropTypes.string,
  githubUrl: PropTypes.string,
  liveUrl: PropTypes.string,
  slug: PropTypes.string
};

export default FeaturedProjectCard; 