import React, { useEffect, useMemo, useState } from 'react';
import { FeaturedEventCard } from '../components/events';
import { fetchCategories, fetchEvents } from '../services/api';
import '../styles/components/events.css';

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
    // En yakın tarihliye göre sırala (start_time artan)
    return list.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  }, [events, activeFilter]);

  if (loading) return <div className="events-section loading">Yükleniyor...</div>;
  if (error) return <div className="events-section error">{error}</div>;

  return (
    <section className="events-section">
      <div className="events-container">
        <h2 className="section-title">Etkinlikler</h2>
        <p className="section-description">
          Matematik ve bilgisayar bilimleri alanında düzenlediğimiz etkinlikler,
          workshoplar ve seminerler
        </p>

        <div className="events-filters">
          <div className="buttons">
            <button
              className={`filter-button ${!activeFilter ? 'active' : ''}`}
              onClick={() => setActiveFilter(null)}
            >
              Tümü
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                className={`filter-button ${activeFilter === category.id ? 'active' : ''}`}
                onClick={() => setActiveFilter(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div className="events-list">
          {filteredAndSorted.map(event => {
            const isPast = new Date(event.end_time || event.start_time) < new Date();
            return (
              <div key={event.id} className={isPast ? 'is-past' : ''}>
                <FeaturedEventCard
                  title={event.title}
                  date={new Date(event.start_time)}
                  location={event.location}
                  description={event.description}
                  image={event.image_url}
                  startTime={event.start_time}
                  endTime={event.end_time}
                  maxParticipants={event.max_participants}
                  slug={event.slug}
                />
              </div>
            );
          })}
        </div>

        {filteredAndSorted.length === 0 && (
          <p className="no-events">Bu kategoride etkinlik bulunamadı.</p>
        )}
      </div>
    </section>
  );
}


