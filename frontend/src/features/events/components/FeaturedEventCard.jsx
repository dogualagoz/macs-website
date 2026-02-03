import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Star } from 'lucide-react';
import { getImageUrl, handleImageError } from '../../../utils/imageUtils';

/**
 * Featured Event Card Component
 * Displays a featured event card with enhanced design
 */
export default function FeaturedEventCard({ event }) {
  const getDateObject = (dateStr) => {
    if (!dateStr) return new Date();
    if (typeof dateStr === 'string') {
      const str = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
      return new Date(str);
    }
    return new Date(dateStr);
  };

  const isPast = getDateObject(event.end_time || event.start_time) < new Date();
  
  const formatDate = (date) => {
    try {
      const dateObj = getDateObject(date);
      if (isNaN(dateObj.getTime())) return 'Tarih Yok';
      return new Intl.DateTimeFormat('tr-TR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(dateObj);
    } catch (e) {
      return 'Tarih Yok';
    }
  };

  return (
    <Link to={`/etkinlikler/${event.slug}`} style={{ textDecoration: 'none' }}>
      <div className="group relative overflow-hidden rounded-2xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 h-full">
          {/* Image Container - Left Side */}
          <div className="relative h-64 md:h-80 overflow-hidden bg-gray-100 col-span-1">
            <img
              src={getImageUrl(event.image_url)}
              alt={event.title}
              onError={handleImageError}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {isPast && (
              <div className="absolute inset-0 bg-black/40"></div>
            )}
          </div>

          {/* Content Container - Right Side */}
          <div className="p-6 md:p-8 flex flex-col justify-between col-span-1 md:col-span-2">
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
                {event.title}
              </h3>

              {/* Description */}
              <p className="text-gray-600 mb-6 line-clamp-3 text-base leading-relaxed">
                {event.description}
              </p>

              {/* Date and Location */}
              <div className="flex flex-wrap gap-6 text-sm text-gray-600 mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">{formatDate(event.start_time)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">{event.location}</span>
                </div>
              </div>

              {/* Technologies/Tags */}
              {event.technologies && event.technologies.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {event.technologies.map((tech, idx) => (
                    <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button className="flex-1 px-6 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition text-center">
                Detayları Gör
              </button>
              {event.registration_link && (
                <a
                  href={event.registration_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-6 py-3 bg-blue-50 text-blue-700 rounded-lg font-semibold hover:bg-blue-100 transition text-center border border-blue-200"
                >
                  Kayıt Ol
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
