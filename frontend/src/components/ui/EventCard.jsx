/**
 * EventCard Component
 * 
 * Displays an individual event card with event details including:
 * - Event image and category
 * - Title and description
 * - Date and location
 * - Details button
 */
import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { getImageUrl, handleImageError } from '../../utils/imageUtils';

const EventCard = ({ title, date, location, description, image, slug }) => {
  // Tarihi formatla
  const formatDate = (date) => {
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };
  
  // Tarihi geçmiş mi kontrol et
  const isPast = new Date(date) < new Date();
  // formatDate fonksiyonu korundu, getImageUrl artık import edildi

  return (
    <Link to={`/etkinlikler/${slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
    <div className="event-card">
      {/* Event image */}
      <div className="event-image">
        <img 
          src={getImageUrl(image)} 
          alt={title}
          onError={(e) => handleImageError(e)}
        />
      </div>

      {/* Event content section */}
      <div className="event-content">
        <h3 className="event-title">{title}</h3>
        <div className={isPast ? "come-past" : "come"}>{isPast ? "Geçmiş" : "Yaklaşan"}</div>
        
        {/* Event details (date and location) */}
        <div className="event-details-1">
          <div className="event-date">
            <img src="/assets/images/img_calender.png" alt="Tarih" className="detail-icon" />
            <span>{formatDate(date)}</span>
          </div>
          </div>
          <div className="event-details-2">
          <div className="event-detail">
            <img src="/assets/images/img_location.png" alt="Konum" className="detail-icon" />
            <span>{location}</span>
          </div>
        </div>

        <p className="event-description">{description}</p>
        <div className="clock">
              <img src="/assets/images/img_clock.png" alt="saat" />
              <span>14:00-18:00</span>
            </div>
        {/* <button className="event-button">Detaylar</button> */}
      </div>
    </div>
    </Link>
  );
};

EventCard.propTypes = {
  title: PropTypes.string.isRequired,
  date: PropTypes.instanceOf(Date).isRequired,
  location: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  image: PropTypes.string,
  slug: PropTypes.string.isRequired
};

export default EventCard; 