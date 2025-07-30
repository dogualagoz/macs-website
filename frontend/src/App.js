/**
 * Main App component that serves as the root of the application.
 * Handles the overall layout and navigation state.
 */
import React, { useState, useEffect } from 'react';
import Header from './components/layout/Header';
import HeroSection from './components/sections/HeroSection';
import EventsSection from './components/sections/EventsSection';
import ProjectsSection from './components/sections/ProjectsSection';
import './styles/App.css';

function App() {
  // State to track whether the page has been scrolled
  const [isScrolled, setIsScrolled] = useState(false);

  // Effect to handle scroll events and update header styling
  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      setIsScrolled(offset > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="app">
      <Header isScrolled={isScrolled} />
      <main>
        <HeroSection />
        <EventsSection />
        <ProjectsSection />
      </main>
    </div>
  );
}

export default App;