import React, { useState, useEffect } from "react";
import HeroSection from '../components/sections/HeroSection';
// import EventsSection from '../components/sections/EventsSection';
// import ProjectsSection from '../components/sections/ProjectsSection';
import AboutSection from '../components/sections/AboutSection';
import TeamSection from '../components/sections/TeamSection';
import Dashboard from "../components/sections/DashBoard";
import '../styles/pages/home.css';

export default function Home() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1 saniye sonra loading false olacak
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
 <>
      {loading ? (
    <div className="loader-wrapper">
      <div>
        <div className="loader">
          <span><span /><span /><span /><span /></span>
          <div className="base">
            <span />
            <div className="face" />
          </div>
        </div>
        <div className="longfazers">
          <span /><span /><span /><span />
        </div>
      </div>
    </div>
      ) : (
        <div className="page-content fade-in">
          <HeroSection />
          <Dashboard></Dashboard>
          {/* <EventsSection />
          <ProjectsSection /> */}
          <AboutSection />
          <TeamSection />
        </div>
      )}
    </>
  );
}