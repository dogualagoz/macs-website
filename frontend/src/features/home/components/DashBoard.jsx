import React, { useState, useEffect } from "react";
import ProjectsSection from "./ProjectsSection";
import EventsSection from "./EventsSection";
import { eventService, projectService } from "../../../shared/services/api";
import { mockEvents, mockEventCategories } from "../../events/data/mockEvents";
import { mockProjects, mockProjectCategories } from "../../projects/data/mockProjects";
import { USE_MOCK_FALLBACK } from "../../../shared/utils/mockFallback";
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
        // Boş liste geçerli bir yanıt ("henüz proje yok"); örnek veriyle doldurulmaz.
        const allProjects = Array.isArray(projectsList) ? projectsList : [];
        
        // Anasayfada proje türü ayrımı yok: developed, supported ve showcase'in
        // tamamı listeleniyor, en yeni eklenen başta olacak şekilde.
        // Backend zaten created_at'e göre sıralı dönüyor; burada tekrar
        // sıralamak sıranın kaynağını açık kılıyor.
        const sortedProjects = [...allProjects].sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
        );

        setProjects(sortedProjects);
        setProjectCategories(Array.isArray(projectCategoriesData) ? projectCategoriesData : []);
        // Öne çıkan proje admin panelinden seçiliyor (is_featured). /projects/featured
        // işaretli projeyi, yoksa en yeniyi döndürür; 404'te getFeatured null verir.
        setFeaturedProject(featuredProjectData || sortedProjects.find(p => p.is_featured) || sortedProjects[0]);

        // Events
        const finalEvents = Array.isArray(eventsData) ? eventsData : [];
        setEvents(finalEvents);
        setEventCategories(Array.isArray(eventCategoriesData) ? eventCategoriesData : []);
        setFeaturedEvent(featuredEventData || finalEvents.find(e => e.is_featured) || finalEvents[0]);

        setError(null);
      } catch (err) {
        console.error('Error loading dashboard data:', err);

        // Production'da arıza arıza olarak görünmeli; örnek veri yalnızca geliştirmede.
        if (!USE_MOCK_FALLBACK) {
          setError('Etkinlik ve projeler yüklenemedi. Lütfen biraz sonra tekrar deneyin.');
          return;
        }

        const mappedMockProjects = mockProjects.map(projectService._mapProject);
        
        const filteredMockProjects = mappedMockProjects;
        
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
