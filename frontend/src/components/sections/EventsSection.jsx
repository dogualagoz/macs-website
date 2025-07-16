/**
 * EventsSection Component
 * 
 * Displays a filterable grid of events with:
 * - Section title and description
 * - Category filter buttons
 * - Event cards grid
 * - Load more button
 */
import React, { useState } from 'react';
import EventCard from '../EventCard';
import '../../styles/components/events.css';

// Available event categories
const CATEGORIES = ['Tümü', 'Workshop', 'Seminer', 'Hackathon', 'Söyleşi'];

// Sample event data (TODO: Replace with API call)
const EVENTS_DATA = [
  {
    id: 1,
    title: "Yapay Zeka Workshop",
    date: "15 Mayıs 2024",
    location: "MM1 Amfi",
    description: "Yapay zeka ve makine öğrenmesi üzerine uygulamalı workshop etkinliği.",
    image: "/assets/images/img_innovation.png",
    category: "Workshop"
  },
  {
    id: 2,
    title: "Yazılım Kariyer Günü",
    date: "20 Mayıs 2024",
    location: "Kongre Merkezi",
    description: "Sektör profesyonelleri ile kariyer ve yazılım üzerine sohbet.",
    image: "/assets/images/img_handshake.png",
    category: "Seminer"
  },
  {
    id: 3,
    title: "Web Geliştirme Atölyesi",
    date: "25 Mayıs 2024",
    location: "Online",
    description: "Modern web teknolojileri ve uygulama geliştirme pratikleri.",
    image: "/assets/images/img_source_code.png",
    category: "Workshop"
  }
];

const EventsSection = () => {
  // State for active category filter
  const [activeFilter, setActiveFilter] = useState('Tümü');

  // Filter events based on selected category
  const filteredEvents = activeFilter === 'Tümü'
    ? EVENTS_DATA
    : EVENTS_DATA.filter(event => event.category === activeFilter);

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
          {CATEGORIES.map(category => (
            <button
              key={category}
              className={`filter-button ${activeFilter === category ? 'active' : ''}`}
              onClick={() => setActiveFilter(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Events grid */}
        <div className="events-grid">
          {filteredEvents.map(event => (
            <EventCard key={event.id} {...event} />
          ))}
        </div>

        {/* Load more button */}
        <div className="events-cta">
          <button className="load-more-button">Daha Fazla Göster</button>
        </div>
      </div>
    </section>
  );
};

export default EventsSection; 