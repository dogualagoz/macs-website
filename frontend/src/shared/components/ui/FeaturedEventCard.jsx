/**
 * FeaturedEventCard Component
 * 
 * Displays a featured event card with enhanced design
 */
import React from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Star } from 'lucide-react';
import { getImageUrl, handleImageError } from '../../../utils/imageUtils';

const FeaturedEventCard = ({ title, date, location, description, image, startTime, endTime, maxParticipants, slug }) => {
  const getDateObject = (dateStr) => {
    if (!dateStr) return new Date();
    if (typeof dateStr === 'string') {
      return new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    }
    return new Date(dateStr);
  };

  // Tarihi formatla
  const formatDate = (dateStr) => {
    try {
      const dateObj = getDateObject(dateStr);
      if (isNaN(dateObj.getTime())) return 'Tarih Yok';
      return new Intl.DateTimeFormat('tr-TR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }).format(dateObj);
    } catch (e) {
      return 'Tarih Yok';
    }
  };

  // Tarihi geçmiş mi kontrol et
  const isPast = getDateObject(endTime || startTime) < new Date();

  const navigate = useNavigate();

  const handleCardClick = () => {
    if (slug) {
      navigate(`/etkinlikler/${slug}`);
    }
  };

  const handleButtonClick = (e) => {
    e.stopPropagation(); // Butona tıklandığında kartın tıklanma olayını tetikleme
  };

  return (
    <div 
      onClick={handleCardClick} 
      className="featured-event-card-wrapper group relative overflow-hidden rounded-2xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-200 cursor-pointer"
    >
      <div className="featured-event-card-grid">
        {/* Image Container - Left Side */}
        <div className="featured-event-card-image relative overflow-hidden bg-gray-100">
          <img
            src={getImageUrl(image)}
            alt={title}
            onError={handleImageError}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            style={isPast ? { filter: 'grayscale(100%)' } : {}}
          />
          {isPast && (
            <div className="absolute inset-0 bg-black/40"></div>
          )}
        </div>

        {/* Content Container - Right Side */}
        <div className="featured-event-card-content p-8 flex flex-col justify-between">
          {/* Featured Badge */}
          <div>
            <div className="mb-4">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-blue-600 text-white">
                <Star className="h-4 w-4 fill-white" />
                ÖNE ÇIKAN
              </span>
            </div>

            {/* Title */}
            <h3 className="text-3xl font-bold text-gray-900 mb-4 line-clamp-2 group-hover:text-blue-700 transition">
              {title}
            </h3>

            {/* Description */}
            <p className="text-gray-600 mb-6 line-clamp-3 text-base leading-relaxed">
              {description}
            </p>

            {/* Date and Location */}
            <div className="flex flex-wrap gap-6 text-sm text-gray-600 mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span className="font-medium">{formatDate(date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                <span className="font-medium">{location}</span>
              </div>
            </div>

            {/* Participants - Sabit değer */}
            <div className="text-sm text-gray-600 mb-6">
              Kapasite: <span className="font-semibold text-gray-700">100 Katılımcı</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200" onClick={handleButtonClick}>
            <Link 
              to={`/etkinlikler/${slug || ''}`} 
              className="flex-1 px-6 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition text-center"
              style={{ textDecoration: 'none' }}
            >
              Detayları Gör
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

FeaturedEventCard.propTypes = {
  title: PropTypes.string.isRequired,
  date: PropTypes.string,
  location: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  image: PropTypes.string,
  startTime: PropTypes.string,
  endTime: PropTypes.string,
  maxParticipants: PropTypes.number,
  slug: PropTypes.string
};

export default FeaturedEventCard; 