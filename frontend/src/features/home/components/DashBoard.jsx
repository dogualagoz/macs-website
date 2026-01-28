import React, { useState, useEffect } from "react";
import ProjectsSection from "./ProjectsSection";
import EventsSection from "./EventsSection";
import { eventService, projectService } from "../../../shared/services/api";
import { mockEvents, mockEventCategories } from "../../events/data/mockEvents";
import { mockProjects, mockProjectCategories } from "../../projects/data/mockProjects";
import '../../../styles/pages/DashBoard.css';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  const [projects, setProjects]                 = useState([]);
  const [projectCategories, setProjectCategories] = useState([]);
  const [featuredProject, setFeaturedProject]   = useState(null);

  const [events, setEvents]                     = useState([]);
  const [eventCategories, setEventCategories]   = useState([]);
  const [featuredEvent, setFeaturedEvent]       = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [
          projectsData,
          projectCategoriesData,
          featuredProjectData,
          eventsData,
          eventCategoriesData,
          featuredEventData,
        ] = await Promise.all([
          projectService.getAll(),
          projectService.getCategories(),
          projectService.getFeatured(),
          eventService.getAll(),
          eventService.getCategories(),
          eventService.getFeatured(),
        ]);

        setProjects((projectsData && (projectsData.projects || projectsData).length > 0) ? (projectsData.projects || projectsData) : mockProjects);
        setProjectCategories((projectCategoriesData && projectCategoriesData.length > 0) ? projectCategoriesData : mockProjectCategories);
        setFeaturedProject(featuredProjectData || mockProjects.find(p => p.is_featured));

        setEvents((eventsData && eventsData.length > 0) ? eventsData : mockEvents);
        setEventCategories((eventCategoriesData && eventCategoriesData.length > 0) ? eventCategoriesData : mockEventCategories);
        setFeaturedEvent(featuredEventData || mockEvents.find(e => e.is_featured));

        setError(null);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        // API hatası durumunda mock data kullan
        console.log('Using mock data for dashboard');
        setProjects(mockProjects);
        setProjectCategories(mockProjectCategories);
        setFeaturedProject(mockProjects.find(p => p.is_featured));

        setEvents(mockEvents);
        setEventCategories(mockEventCategories);
        setFeaturedEvent(mockEvents.find(e => e.is_featured));

        setError(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <main className="dashboard">
      {/* Yükleniyor */}
      {loading && (
        <section className="dashboard-status">
          <div className="spinner">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="spinner-blade" />
            ))}
          </div>
        </section>
      )}

      {/* Hata */}
     {!loading && error && (
        <section className="dashboard-status dashboard-error">
            <div className="error-card">
            <div className="error-icon">⚠️</div>
            <div className="error-content">
                <h2>Bir şeyler ters gitti</h2>
                <p>{error}</p>
                <button className="retry-btn" onClick={() => window.location.reload()}>
                Tekrar Dene
                </button>
            </div>
            </div>
        </section>
)}

      {/* İçerik */}
      {!loading && !error && (
        <>
          <EventsSection
            events={events}
            categories={eventCategories}
            featuredEvent={featuredEvent}
          />
          <ProjectsSection
            projects={projects}
            categories={projectCategories}
            featuredProject={featuredProject}
          />
        </>
      )}
    </main>
  );
};

export default Dashboard;
