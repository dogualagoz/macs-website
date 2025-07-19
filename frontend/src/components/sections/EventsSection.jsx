/**
 * EventsSection Component
 * 
 * Displays a filterable grid of events with:
 * - Section title and description
 * - Category filter buttons
 * - Event cards grid
 */
import React, { useState, useEffect } from 'react';
import EventCard from '../ui/EventCard';
import { fetchEvents, fetchCategories } from '../../services/api';
import '../../styles/components/events.css';

const EventsSection = () => {
  // State for events data and loading
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);

  // Fetch events and categories when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [eventsData, categoriesData] = await Promise.all([
          fetchEvents(),
          fetchCategories()
        ]);
        setEvents(eventsData);
        setCategories(categoriesData);
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
          Topluluğumuz ile bilgisayar ve matematik dünyasını keşfetmeye hazır mısın?
        </p>

        {/* Category filters */}
        <div className="events-filters">
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

        {/* Events grid */}
        <div className="events-grid">
          {filteredEvents.map(event => (
            <EventCard 
              key={event.id}
              title={event.title}
              description={event.description}
              date={new Date(event.start_time)}
              location={event.location}
              image={event.image_url}
            />
          ))}
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