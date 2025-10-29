import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Star, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchCategories, fetchEvents } from '../services/api';
import { getImageUrl, handleImageError } from '../utils/imageUtils';
import '../styles/pages/events2.css';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeFilter, setActiveFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [eventsData, categoriesData] = await Promise.all([
          fetchEvents(),
          fetchCategories()
        ]);
        setEvents(eventsData || []);
        setCategories(categoriesData || []);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Veriler yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredAndSorted = useMemo(() => {
    const list = activeFilter
      ? events.filter(e => e.category_id === activeFilter)
      : events.slice();
    return list.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  }, [events, activeFilter]);

  const featuredEvent = useMemo(() => {
    return events.find(e => e.is_featured) || events[0];
  }, [events]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="spinner center">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="spinner-blade"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-[#07132b] text-white rounded-lg hover:bg-[#07132b]/90 transition"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-20">
      {/* Header Section */}
      <section className="bg-gradient-to-br from-[#07132b] to-[#0a1a3a] text-white py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-7xl px-4"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Etkinlikler</h1>
          <p className="text-lg text-white/80 max-w-2xl">
            Matematik ve bilgisayar bilimleri alanında düzenlediğimiz etkinlikler, workshoplar ve seminerler
          </p>
        </motion.div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12">
        {/* Category Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-12"
        >
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => setActiveFilter(null)}
              className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                !activeFilter
                  ? 'bg-[#07132b] text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tümü
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setActiveFilter(category.id)}
                className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                  activeFilter === category.id
                    ? 'bg-[#07132b] text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Featured Event */}
        {featuredEvent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-16"
          >
            <FeaturedEventCardModern event={featuredEvent} />
          </motion.div>
        )}

        {/* Events Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSorted
            .filter(event => event.id !== featuredEvent?.id)
            .map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
              >
                <EventCardModern event={event} />
              </motion.div>
            ))}
        </div>

        {filteredAndSorted.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <p className="text-gray-500 text-lg">Bu kategoride etkinlik bulunamadı.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Modern Featured Event Card Component
function FeaturedEventCardModern({ event }) {
  const isPast = new Date(event.end_time || event.start_time) < new Date();
  const formatDate = (date) => {
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(date));
  };

  const formatTime = (time) => {
    return new Date(time).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
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

// Modern Event Card Component
function EventCardModern({ event }) {
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


