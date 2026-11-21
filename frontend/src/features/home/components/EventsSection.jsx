/**
 * EventsSection Component
 * 
 * Displays a slider of events with:
 * - Section title and description
 * - Category filter buttons
 * - Event slider with navigation
 */
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EventSlider, FeaturedEventCard } from '../../../shared/components/ui';
import { sortEventsByProximity } from '../../../shared/utils/eventOrder';
import '../../../styles/components/events.css';

const EventsSection = ({ events, categories, featuredEvent }) => {
  const [activeFilter, setActiveFilter] = useState(null);

  // Bugüne en yakın etkinlik önce: yaklaşanlar, ardından geçmişler.
  const orderedEvents = useMemo(() => sortEventsByProximity(events), [events]);

  // Kategoriye göre filtre
  const filteredEvents = activeFilter
    ? orderedEvents.filter(event => event.category_id === activeFilter)
    : orderedEvents;

  const showFeatured = !activeFilter && featuredEvent;
  const sliderEvents = showFeatured
    ? filteredEvents.filter(event => event.id !== featuredEvent.id)
    : filteredEvents;

  return (
    <section className="events-section" id="events">
      <div className="events-container">
        {/* Section header */}
        <h2 className="section-title">Etkinlikler</h2>
        <p className="section-description">
          Matematik ve bilgisayar bilimleri alanında düzenlediğimiz etkinlikler,
          workshoplar ve seminerler
        </p>

        {/* Category filters */}
        <div className="events-filters">
          <div className="filter-chips" role="group" aria-label="Kategori filtresi">
            <button
              className={`filter-chip ${!activeFilter ? 'is-active' : ''}`}
              aria-pressed={!activeFilter}
              onClick={() => setActiveFilter(null)}
            >
              Tümü
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                className={`filter-chip ${activeFilter === category.id ? 'is-active' : ''}`}
                aria-pressed={activeFilter === category.id}
                onClick={() => setActiveFilter(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Featured Event Card */}
        {showFeatured && (
          <div className="events-featured-card">
            <FeaturedEventCard
              title={featuredEvent.title}
              date={featuredEvent.date || featuredEvent.start_time}
              location={featuredEvent.location}
              description={featuredEvent.description}
              image={featuredEvent.image_url || featuredEvent.image}
              startTime={featuredEvent.start_time}
              endTime={featuredEvent.end_time}
              maxParticipants={featuredEvent.max_participants}
              slug={featuredEvent.slug}
            />
          </div>
        )}

        {/* Event Slider */}
        <EventSlider
          events={sliderEvents}
        />

        <div className="More">
          <Link to="/etkinlikler" className='load-more-button' style={{ textDecoration: 'none', display: 'inline-block', textAlign: 'center' }}>
            Daha Fazla Etkinlik Yükle
          </Link>
        </div>

        {/* Show message if no events */}
        {filteredEvents.length === 0 && (
          <p className="no-events">Bu kategoride etkinlik bulunamadı.</p>
        )}
      </div>
    </section>
  );
};

export default EventsSection; 