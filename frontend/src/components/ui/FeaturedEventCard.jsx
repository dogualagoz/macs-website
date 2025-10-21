/**
 * FeaturedEventCard Component
 * 
 * Displays a featured event card with larger size and prominent styling.
 * Similar to EventCard but with different CSS classes for featured appearance.
 */
import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { getImageUrl, handleImageError } from '../../utils/imageUtils';

const FeaturedEventCard = ({ title, date, location, description, image, startTime, endTime, maxParticipants, slug }) => {
  // Tarihi formatla
  const formatDate = (date) => {
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  // Saatleri formatla
  const formatTime = (time) => {
    return new Date(time).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // formatDate ve formatTime fonksiyonları korundu, getImageUrl artık import edildi

  return (
    <Link to={`/etkinlikler/${slug || ''}`} style={{ textDecoration: 'none', color: 'inherit' }}>
    <div className='First'>
      <img 
        className='first-img' 
        src={getImageUrl(image)} 
        alt={title}
        onError={(e) => handleImageError(e)}
      />
      <div className="First-div">Öne Çıkan</div>
      <div className="date">
        <img src="assets/images/img_calender.png" alt="tarih" />
        <span className='date-span'>{formatDate(date)}</span>
      </div>
      <div className="First-tittle">
        <span className='First-tittle-span'>{title}</span>
      </div>
      <div className="First-subtittle">
        <span className='First-subtittle-span'>{description}</span>
      </div>
      <div className="First-hour">
        <img className='First-hour-img' src="assets/images/img_clock.png" alt="saat" />
        <span className="First-hour-span">
          {startTime}
        </span>
      </div>
      <div className="First-location">
        <img src="assets/images/img_location.png" alt="konum" />
        <span className="First-location-span">{location}</span>
      </div>
      <div className="First-persons">
        <img className='First-persons-img' src="assets/images/img_people.png" alt="Katılımcı" />
        <span className="First-persons-span">{maxParticipants || 100} Katılımcı</span>
      </div>
      <div className="First-button">
        <button className="First-button-sign">Kayıt Ol</button>
      </div>
    </div>
    </Link>
  );
};

FeaturedEventCard.propTypes = {
  title: PropTypes.string.isRequired,
  date: PropTypes.instanceOf(Date).isRequired,
  location: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  image: PropTypes.string,
  startTime: PropTypes.string,
  endTime: PropTypes.string,
  maxParticipants: PropTypes.number
  ,slug: PropTypes.string
};

export default FeaturedEventCard; 