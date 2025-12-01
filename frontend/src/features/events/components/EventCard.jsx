import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin } from 'lucide-react';
import { getImageUrl, handleImageError } from '../../../utils/imageUtils';

/**
 * Event Card Component
 * Displays a compact card for regular events in the grid
 */
export default function EventCard({ event }) {
  const isPast = new Date(event.end_time || event.start_time) < new Date();
  
  const formatDate = (date) => {
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
  };

  return (
    <Link to={`/etkinlikler/${event.slug}`}>
      <div className="group relative overflow-hidden rounded-xl bg-white shadow-md hover:shadow-xl transition-all duration-300 h-full flex flex-col">
        {/* Image */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={getImageUrl(event.image_url)}
            alt={event.title}
            onError={handleImageError}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute top-3 left-3">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                isPast
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {isPast ? 'Geçmiş' : 'Yaklaşan'}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(event.start_time)}</span>
          </div>

          <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-[#07132b] transition">
            {event.title}
          </h3>

          <p className="text-sm text-gray-600 mb-4 line-clamp-3 flex-1">
            {event.description}
          </p>

          <div className="flex items-center gap-2 text-sm text-gray-600 pt-4 border-t">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="line-clamp-1">{event.location}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
