import React, { useEffect, useMemo, useState } from 'react';
import { FeaturedEventCard,MoreEventCard } from '../components/events';
import { fetchCategories, fetchEvents } from '../services/api';
import '../styles/components/events.css';

// import { Swiper, SwiperSlide } from 'swiper/react';
// import 'swiper/css';
// import 'swiper/css/navigation';
// import 'swiper/css/pagination';


export default function Events() {
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeFilter, setActiveFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [featuredEvent] = useState(null);

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

if (loading) 
  return (
    <div class="spinner center">
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
</div>
  );

 if (error) 
  return (
    <div className="error-container">
      <div className="error-icon">⚠️</div>
      <p>{error}</p>
      <button onClick={() => window.location.reload()}>Tekrar Dene</button>
    </div>
  );

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
        <div className="Featured">
               <FeaturedEventCard
                      title={(featuredEvent || events[0]).title}
                      date={new Date((featuredEvent || events[0]).start_time)}
                      location={(featuredEvent || events[0]).location}
                      description={(featuredEvent || events[0]).description}
                      image={(featuredEvent || events[0]).image_url}
                      startTime={(featuredEvent || events[0]).start_time}
                      endTime={(featuredEvent || events[0]).end_time}
                      maxParticipants={(featuredEvent || events[0]).max_participants}
                      slug={(featuredEvent || events[0]).slug}
                    />
        </div>
        <div className="events-list">
          {filteredAndSorted
          .filter(event => event.id !== (featuredEvent || events[0])?.id)
          .map((event,index) => {
            const isPast = new Date(event.end_time || event.start_time) < new Date();
            return (
              <div key={event.id} className={isPast ? 'is-past' : ''} > 
                <MoreEventCard
                  title={event.title}
                  date={new Date(event.start_time)}
                  location={event.location}
                  description={event.description}
                  image={event.image_url}
                  startTime={event.start_time}
                  endTime={event.end_time}
                  maxParticipants={event.max_participants}
                  slug={event.slug}
                  style={{ animationDelay: `${index * 0.25}s` }} 
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


