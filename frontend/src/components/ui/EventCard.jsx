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

const EventCard = ({ title, date, location, description, image }) => {
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

  // Resim URL'ini kontrol et
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return '/assets/images/img_innovation.png';
    if (imageUrl.startsWith('http')) return imageUrl;
    return process.env.PUBLIC_URL + imageUrl;
  };

  return (
    <div className="event-card">
      {/* Event image */}
      <div className="event-image">
        <img 
          src={getImageUrl(image)} 
          alt={title}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/assets/images/img_innovation.png';
          }}
        />
      </div>

      {/* Event content section */}
      <div className="event-content">
        <h3 className="event-title">{title}</h3>
        
        {/* Event details (date and location) */}
        <div className="event-details">
          <div className="event-detail">
            <img src="/assets/images/img_calender.png" alt="Tarih" className="detail-icon" />
            <span>{formatDate(date)}</span>
          </div>
          <div className="event-detail">
            <img src="/assets/images/img_location.png" alt="Konum" className="detail-icon" />
            <span>{location}</span>
          </div>
        </div>

        <p className="event-description">{description}</p>
        <button className="event-button">Detaylar</button>
      </div>
    </div>
  );
};

EventCard.propTypes = {
  title: PropTypes.string.isRequired,
  date: PropTypes.instanceOf(Date).isRequired,
  location: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  image: PropTypes.string
};

export default EventCard; 