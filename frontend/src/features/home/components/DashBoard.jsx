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

        // Projects
        const projectsList = projectsData?.projects || projectsData;
        const allProjects = (projectsList && projectsList.length > 0) 
          ? projectsList 
          : mockProjects.map(projectService._mapProject);
        
        // Anasayfada proje türü ayrımı yok: developed, supported ve showcase'in
        // tamamı listeleniyor, en yeni eklenen başta olacak şekilde.
        // Backend zaten created_at'e göre sıralı dönüyor; burada tekrar
        // sıralamak sıranın kaynağını açık kılıyor ve mock fallback verisi
        // devreye girdiğinde de aynı davranışı garantiliyor.
        const sortedProjects = [...allProjects].sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
        );

        setProjects(sortedProjects);
        setProjectCategories((projectCategoriesData && projectCategoriesData.length > 0) ? projectCategoriesData : mockProjectCategories);
        // Öne çıkan proje admin panelinden seçiliyor (is_featured). /projects/featured
        // işaretli projeyi, yoksa en yeniyi döndürür; 404'te getFeatured null verir.
        setFeaturedProject(featuredProjectData || sortedProjects.find(p => p.is_featured) || sortedProjects[0]);

        // Events
        const finalEvents = (eventsData && eventsData.length > 0) ? eventsData : mockEvents.map(eventService._mapEvent);
        setEvents(finalEvents);
        setEventCategories((eventCategoriesData && eventCategoriesData.length > 0) ? eventCategoriesData : mockEventCategories);
        setFeaturedEvent(featuredEventData || finalEvents.find(e => e.is_featured) || finalEvents[0]);

        setError(null);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        console.log('Using mock data for dashboard');
        const mappedMockProjects = mockProjects.map(projectService._mapProject);
        
        // Mock data için de filtre uygula
        const filteredMockProjects = mappedMockProjects.filter(p => p.tab !== 'showcase');
        
        const mappedMockEvents = mockEvents.map(eventService._mapEvent);
        
        setProjects(filteredMockProjects);
        setProjectCategories(mockProjectCategories);
        setFeaturedProject(filteredMockProjects.find(p => p.is_featured) || filteredMockProjects[0]);

        setEvents(mappedMockEvents);
        setEventCategories(mockEventCategories);
        setFeaturedEvent(mappedMockEvents.find(e => e.is_featured) || mappedMockEvents[0]);

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
