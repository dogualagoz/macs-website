import React from 'react';
import HeroSection from '../components/sections/HeroSection';
import EventsSection from '../components/sections/EventsSection';
import ProjectsSection from '../components/sections/ProjectsSection';
import AboutSection from '../components/sections/AboutSection';
import TeamSection from '../components/sections/TeamSection';

export default function Home() {
  return (
    <>
      <HeroSection />
      <EventsSection />
      <ProjectsSection />
      <AboutSection />
      <TeamSection />
    </>
  );
}


