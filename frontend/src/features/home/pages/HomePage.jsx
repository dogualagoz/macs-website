import React, { useState, useEffect } from "react";
import HeroSection from '../components/HeroSection';
import AboutSection from '../components/AboutSection';
import TeamSection from '../components/TeamSection';
import Dashboard from "../components/DashBoard";
import '../../../styles/pages/home.css';

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