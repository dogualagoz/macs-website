/**
 * EventsSection Component
 * 
 * Displays a filterable grid of events with:
 * - Section title and description
 * - Category filter buttons
 * - Event cards grid
 */
import React, { useState, useEffect } from 'react';
import { EventCard, FeaturedEventCard } from '../events';
import { fetchEvents, fetchCategories, fetchFeaturedEvent } from '../../services/api';
import '../../styles/components/events.css';

const EventsSection = () => {
  // State for events data and loading
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [featuredEvent, setFeaturedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);

  // Fetch events and categories when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [eventsData, categoriesData, featuredEventData] = await Promise.all([
          fetchEvents(),
          fetchCategories(),
          fetchFeaturedEvent()
        ]);
        setEvents(eventsData);
        setCategories(categoriesData);
        setFeaturedEvent(featuredEventData);
        setError(null);
      } catch (err) {
        setError('Veriler yüklenirken bir hata oluştu');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter events based on selected category
  const filteredEvents = activeFilter
    ? events.filter(event => event.category_id === activeFilter)
    : events;

  if (loading) return <div className="events-section loading">Yükleniyor...</div>;
  if (error) return <div className="events-section error">{error}</div>;

  return (
    <section className="events-section" id="events">
      <div className="events-container">
        {/* Section header */}
        <h2 className="section-title">Etkinlikler</h2>
        <p className="section-description">
Matematik ve bilgisayar bilimleri alanında düzenlediğimiz etkinlikler,
workshoplar ve seminerler        </p>

        {/* Category filters */}
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

        {/* Öne Çıkan Etkinlik - FeaturedEventCard bileşeni */}
        {(featuredEvent || events[0]) && (
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
        )}
        <br />
        {/* Diğer Etkinlikler - Featured event hariç */}
        <div className="events-grid">
          {filteredEvents
            .filter(event => event.id !== (featuredEvent || events[0])?.id) // Featured event'i çıkar
            .map(event => (
            <EventCard 
              key={event.id}
              title={event.title}
              description={event.description}
              date={new Date(event.start_time)}
              location={event.location}
              image={event.image_url}
              slug={event.slug}
            />
          ))}
          
        </div>
          <div className="More">
            <button className='load-more-button'>Daha Fazla Etkinlik Yükle!</button>
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