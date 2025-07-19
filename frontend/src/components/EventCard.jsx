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

const EventCard = ({ title, date, location, description, image, category }) => {
  return (
    <div className="event-card">
      {/* Event image and category badge */}
      <div className="event-image">
        <img src={image} alt={title} />
        <span className="event-category">{category}</span>
      </div>

      {/* Event content section */}
      <div className="event-content">
        <h3 className="event-title">{title}</h3>
        
        {/* Event details (date and location) */}
        <div className="event-details">
          <div className="event-detail">
            <img src="/assets/images/img_calender.png" alt="Tarih" className="detail-icon" />
            <span>{date}</span>
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
  date: PropTypes.string.isRequired,
  location: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  image: PropTypes.string.isRequired,
  category: PropTypes.string.isRequired
};

export default EventCard; 