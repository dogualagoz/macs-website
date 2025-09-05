import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/admin/Sidebar';
import * as eventsAPI from '../../api/events';
import * as projectsAPI from '../../api/projects';

/**
 * Dashboard sayfası
 * Etkinlikler ve projeler için yönetim tabloları içerir
 */
const Dashboard = () => {
  // State tanımlamaları
  const [activeTab, setActiveTab] = useState('events');
  const [events, setEvents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Etkinlikleri getir
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const eventsData = await eventsAPI.fetchEventsAdmin({ limit: 100 });
      setEvents(eventsData);
    } catch (err) {
      console.error("Etkinlikleri getirme hatası:", err);
      setError("Etkinlikleri getirirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Projeleri getir
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await projectsAPI.fetchProjectsAdmin({ limit: 100 });
      if (response.projects) {
        setProjects(response.projects);
      } else {
        setProjects(Array.isArray(response) ? response : []);
      }
    } catch (err) {
      console.error("Projeleri getirme hatası:", err);
      setError("Projeleri getirirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Etkinlik silme işlemi
  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Bu etkinliği silmek istediğinize emin misiniz?")) {
      return;
    }
    
    try {
      await eventsAPI.deleteEvent(eventId);
      // Etkinlik listesini güncelle
      setEvents(events.filter(e => e.id !== eventId));
      alert("Etkinlik başarıyla silindi!");
    } catch (err) {
      console.error("Etkinlik silme hatası:", err);
      alert("Etkinlik silinirken bir hata oluştu: " + err.message);
    }
  };
  
  // Etkinlik aktiflik durumunu değiştirme
  const handleToggleEventActive = async (event) => {
    try {
      const updatedEvent = { ...event, is_active: !event.is_active };
      await eventsAPI.updateEvent(event.id, { is_active: !event.is_active });
      
      // Etkinlik listesini güncelle
      setEvents(events.map(e => e.id === event.id ? { ...e, is_active: !e.is_active } : e));
      
      alert(`Etkinlik ${updatedEvent.is_active ? 'aktif' : 'pasif'} duruma getirildi.`);
    } catch (err) {
      console.error("Etkinlik güncelleme hatası:", err);
      alert("Etkinlik güncellenirken bir hata oluştu: " + err.message);
    }
  };
  
  // Etkinliği öne çıkarma
  const handleToggleEventFeatured = async (event) => {
    try {
      const updatedEvent = { ...event, is_featured: !event.is_featured };
      await eventsAPI.updateEvent(event.id, { is_featured: !event.is_featured });
      
      // Etkinlik listesini güncelle
      setEvents(events.map(e => {
        if (e.id === event.id) {
          return { ...e, is_featured: !e.is_featured };
        } else if (updatedEvent.is_featured) {
          // Eğer bu etkinlik öne çıkarıldıysa, diğer tüm etkinliklerin öne çıkarma özelliğini kaldır
          return { ...e, is_featured: false };
        }
        return e;
      }));
      
      alert(`Etkinlik ${updatedEvent.is_featured ? 'öne çıkarıldı' : 'öne çıkarma özelliği kaldırıldı'}.`);
    } catch (err) {
      console.error("Etkinlik güncelleme hatası:", err);
      alert("Etkinlik güncellenirken bir hata oluştu: " + err.message);
    }
  };

  // Proje silme işlemi
  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("Bu projeyi silmek istediğinize emin misiniz?")) {
      return;
    }
    
    try {
      await projectsAPI.deleteProject(projectId);
      // Proje listesini güncelle
      setProjects(projects.filter(p => p.id !== projectId));
      alert("Proje başarıyla silindi!");
    } catch (err) {
      console.error("Proje silme hatası:", err);
      alert("Proje silinirken bir hata oluştu: " + err.message);
    }
  };
  
  // Proje aktiflik durumunu değiştirme
  const handleToggleProjectActive = async (project) => {
    try {
      const updatedProject = { ...project, is_active: !project.is_active };
      await projectsAPI.updateProject(project.id, { is_active: !project.is_active });
      
      // Proje listesini güncelle
      setProjects(projects.map(p => p.id === project.id ? { ...p, is_active: !p.is_active } : p));
      
      alert(`Proje ${updatedProject.is_active ? 'aktif' : 'pasif'} duruma getirildi.`);
    } catch (err) {
      console.error("Proje güncelleme hatası:", err);
      alert("Proje güncellenirken bir hata oluştu: " + err.message);
    }
  };
  
  // Projeyi öne çıkarma
  const handleToggleProjectFeatured = async (project) => {
    try {
      const updatedProject = { ...project, is_featured: !project.is_featured };
      await projectsAPI.updateProject(project.id, { is_featured: !project.is_featured });
      
      // Proje listesini güncelle
      setProjects(projects.map(p => {
        if (p.id === project.id) {
          return { ...p, is_featured: !p.is_featured };
        } else if (updatedProject.is_featured) {
          // Eğer bu proje öne çıkarıldıysa, diğer tüm projelerin öne çıkarma özelliğini kaldır
          return { ...p, is_featured: false };
        }
        return p;
      }));
      
      alert(`Proje ${updatedProject.is_featured ? 'öne çıkarıldı' : 'öne çıkarma özelliği kaldırıldı'}.`);
    } catch (err) {
      console.error("Proje güncelleme hatası:", err);
      alert("Proje güncellenirken bir hata oluştu: " + err.message);
    }
  };

  // Aktif sekmeye göre veri getir
  useEffect(() => {
    if (activeTab === 'events') {
      fetchEvents();
    } else if (activeTab === 'projects') {
      fetchProjects();
    }
  }, [activeTab, fetchEvents, fetchProjects]);

  return (
    <div className="admin-container">
      <Sidebar />
      
      <main className="admin-main">
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">Dashboard</h2>
          </div>
          
          <div className="admin-card-body">
            <div className="tabs">
              <div className="tabs-list">
                <button 
                  onClick={() => setActiveTab('events')} 
                  className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
                >
                  Etkinlikler
                </button>
                <button 
                  onClick={() => setActiveTab('projects')} 
                  className={`tab-btn ${activeTab === 'projects' ? 'active' : ''}`}
                >
                  Projeler
                </button>
              </div>
            </div>
            
            {activeTab === 'events' && (
              <div className="dashboard-table-container">
                {loading && <p>Etkinlikler yükleniyor...</p>}
                
                {error && <p className="error-message">{error}</p>}
                
                {!loading && !error && (
                  <>
                    <div className="dashboard-table-header">
                      <div className="dashboard-table-row header">
                        <div className="dashboard-table-cell">ID</div>
                        <div className="dashboard-table-cell">Başlık</div>
                        <div className="dashboard-table-cell">Tarih</div>
                        <div className="dashboard-table-cell">Konum</div>
                        <div className="dashboard-table-cell">Durum</div>
                        <div className="dashboard-table-cell">Öne Çıkan</div>
                        <div className="dashboard-table-cell">İşlemler</div>
                      </div>
                    </div>
                    
                    <div className="dashboard-table-body">
                      {events.length === 0 ? (
                        <p>Etkinlik bulunamadı.</p>
                      ) : (
                        events.map((event) => (
                          <div key={event.id} className="dashboard-table-row">
                            <div className="dashboard-table-cell">{event.id}</div>
                            <div className="dashboard-table-cell">{event.title}</div>
                            <div className="dashboard-table-cell">
                              {new Date(event.start_time).toLocaleDateString('tr-TR')}
                            </div>
                            <div className="dashboard-table-cell">{event.location}</div>
                            <div className="dashboard-table-cell">
                              <span className={`status-badge ${event.is_active ? 'active' : 'inactive'}`}>
                                {event.is_active ? 'Aktif' : 'Pasif'}
                              </span>
                            </div>
                            <div className="dashboard-table-cell">
                              <span className={`featured-badge ${event.is_featured ? 'featured' : ''}`}>
                                {event.is_featured ? 'Öne Çıkan' : '-'}
                              </span>
                            </div>
                            <div className="dashboard-table-cell actions">
                              <button 
                                onClick={() => handleToggleEventActive(event)}
                                className={`status-btn ${event.is_active ? 'deactivate' : 'activate'}`}
                                title={event.is_active ? 'Pasif yap' : 'Aktif yap'}
                              >
                                {event.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                              </button>
                              <button 
                                onClick={() => handleToggleEventFeatured(event)}
                                className={`featured-btn ${event.is_featured ? 'unfeatured' : 'featured'}`}
                                title={event.is_featured ? 'Öne çıkarmayı kaldır' : 'Öne çıkar'}
                              >
                                {event.is_featured ? 'Öne Çıkarmayı Kaldır' : 'Öne Çıkar'}
                              </button>
                              <button 
                                onClick={() => handleDeleteEvent(event.id)}
                                className="delete-btn"
                                title="Etkinliği sil"
                              >
                                Sil
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
            
            {activeTab === 'projects' && (
              <div className="dashboard-table-container">
                {loading && <p>Projeler yükleniyor...</p>}
                
                {error && <p className="error-message">{error}</p>}
                
                {!loading && !error && (
                  <>
                    <div className="dashboard-table-header">
                      <div className="dashboard-table-row header">
                        <div className="dashboard-table-cell">ID</div>
                        <div className="dashboard-table-cell">Başlık</div>
                        <div className="dashboard-table-cell">Kategori</div>
                        <div className="dashboard-table-cell">Teknolojiler</div>
                        <div className="dashboard-table-cell">Durum</div>
                        <div className="dashboard-table-cell">Öne Çıkan</div>
                        <div className="dashboard-table-cell">İşlemler</div>
                      </div>
                    </div>
                    
                    <div className="dashboard-table-body">
                      {projects.length === 0 ? (
                        <p>Proje bulunamadı.</p>
                      ) : (
                        projects.map((project) => (
                          <div key={project.id} className="dashboard-table-row">
                            <div className="dashboard-table-cell">{project.id}</div>
                            <div className="dashboard-table-cell">{project.title}</div>
                            <div className="dashboard-table-cell">
                              {project.category?.name || '-'}
                            </div>
                            <div className="dashboard-table-cell">
                              {project.technologies || '-'}
                            </div>
                            <div className="dashboard-table-cell">
                              <span className={`status-badge ${project.is_active ? 'active' : 'inactive'}`}>
                                {project.is_active ? 'Aktif' : 'Pasif'}
                              </span>
                            </div>
                            <div className="dashboard-table-cell">
                              <span className={`featured-badge ${project.is_featured ? 'featured' : ''}`}>
                                {project.is_featured ? 'Öne Çıkan' : '-'}
                              </span>
                            </div>
                            <div className="dashboard-table-cell actions">
                              <button 
                                onClick={() => handleToggleProjectActive(project)}
                                className={`status-btn ${project.is_active ? 'deactivate' : 'activate'}`}
                                title={project.is_active ? 'Pasif yap' : 'Aktif yap'}
                              >
                                {project.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                              </button>
                              <button 
                                onClick={() => handleToggleProjectFeatured(project)}
                                className={`featured-btn ${project.is_featured ? 'unfeatured' : 'featured'}`}
                                title={project.is_featured ? 'Öne çıkarmayı kaldır' : 'Öne çıkar'}
                              >
                                {project.is_featured ? 'Öne Çıkarmayı Kaldır' : 'Öne Çıkar'}
                              </button>
                              <button 
                                onClick={() => handleDeleteProject(project.id)}
                                className="delete-btn"
                                title="Projeyi sil"
                              >
                                Sil
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
