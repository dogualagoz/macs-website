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
        console.log({eventsData},":events",{categoriesData},": katagoriler")
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

        {/* Sonradan Eklendi Backende bağlı değil */}
        <div className='First'>
          <img className='first-img' src="assets/images/bootcamp.jpg" alt="Resim" />
          <div className="First-div">Öne Çıkan</div>
          <div className="date">
            <img src="assets/images/img_calender.png" alt="tarih" />
           <span className='date-span'>15 Eylül 2025</span>
          </div>
          <div className="First-tittle">
            <span className='First-tittle-span'>Yapay Zeka ve Makine Öğrenmesi Workshop’u</span>
            </div>
          <div className="First-subtittle">
            <span className='First-subtittle-span'>Python kullanarak yapay zeka ve makine öğrenmesi temellerini öğrenin. Uygulamalı projelerle desteklenen 2 günlük yoğun workshop programı.</span>
            </div>
            <div className="First-hour">
              <img  className='First-hour-img' src="assets/images/img_clock.png" alt="saat" />
              <span className="First-hour-span">14:00-18:00</span>
            </div>
          <div className="First-location">
              <img src="assets/images/img_location.png" alt="konum" />
              <span className="First-location-span">Bilgisayar Lab 1</span>
            </div>
            <div className="First-persons">
              <img className='First-persons-img' src="assets/images/img_people.png" alt="Katılımcı" />
              <span className="First-persons-span">25 Katılımcı</span>
              </div>
              <div className="First-button">
                <button className="First-button-sign">Kayıt Ol</button>
                </div>
          </div>
        <br />
        {/* Sonradan Eklendı */}
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