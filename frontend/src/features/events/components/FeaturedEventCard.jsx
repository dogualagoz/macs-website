import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Clock, Star, Users } from 'lucide-react';
import { getImageUrl, handleImageError } from '../../../utils/imageUtils';

/**
 * Featured Event Card Component
 * Displays a large, prominent card for the featured event
 */
export default function FeaturedEventCard({ event }) {
  const isPast = new Date(event.end_time || event.start_time) < new Date();
  
  const formatDate = (date) => {
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(date));
  };

  const formatTime = (time) => {
    // Backend'den UTC geldiği için 'Z' ekleyerek parse et
    const date = new Date(time + 'Z');
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Istanbul',
    });
  };

  return (
    <Link to={`/etkinlikler/${event.slug}`}>
      <div className="relative overflow-hidden rounded-2xl bg-white shadow-xl hover:shadow-2xl transition-all duration-300 group">
        <div className="grid md:grid-cols-2 gap-6 p-6">
          {/* Image */}
          <div className="relative h-64 md:h-full rounded-xl overflow-hidden">
            <img
              src={getImageUrl(event.image_url)}
              alt={event.title}
              onError={handleImageError}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute top-4 left-4">
              <span
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
                  isPast
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                <Star className="h-4 w-4" />
                {isPast ? 'Geçmiş' : 'Öne Çıkan'}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col justify-between">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 group-hover:text-[#07132b] transition">
                {event.title}
              </h3>
              <p className="text-gray-600 mb-6 line-clamp-3">{event.description}</p>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-700">
                  <Calendar className="h-5 w-5 text-[#07132b]" />
                  <span className="font-medium">{formatDate(event.start_time)}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <Clock className="h-5 w-5 text-[#07132b]" />
                  <span>{formatTime(event.start_time)}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <MapPin className="h-5 w-5 text-[#07132b]" />
                  <span>{event.location}</span>
                </div>
                {event.max_participants && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <Users className="h-5 w-5 text-[#07132b]" />
                    <span>{event.max_participants} Katılımcı</span>
                  </div>
                )}
              </div>
            </div>

            {!isPast && (
              <div className="mt-6 flex gap-3">
                {event.registration_link ? (
                  <a 
                    href={event.registration_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full md:w-auto px-8 py-3 bg-[#07132b] text-white rounded-lg font-semibold hover:bg-[#07132b]/90 transition text-center"
                  >
                    Kayıt Ol
                  </a>
                ) : (
                  <button
                    disabled
                    className="w-full md:w-auto px-8 py-3 bg-gray-300 text-gray-500 rounded-lg font-semibold cursor-not-allowed text-center"
                  >
                    Kayıt Ol
                  </button>
                )}
                <Link 
                  to={`/etkinlikler/${event.slug}`}
                  className="w-full md:w-auto px-8 py-3 bg-gray-100 text-gray-900 rounded-lg font-semibold hover:bg-gray-200 transition text-center"
                >
                  Detayları Gör
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
