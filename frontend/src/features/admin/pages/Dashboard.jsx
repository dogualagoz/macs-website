import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { eventService, projectService, sponsorService } from '../../../shared/services/api';
import env from '../../../shared/config/env';

// Backend URL'den /api kısmını çıkar ve image URL ile birleştir
const getImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  // Eğer zaten tam URL ise direkt döndür
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  // Backend base URL'ini al (API URL'den /api kısmını çıkar)
  const apiUrl = env.apiUrl || 'http://localhost:8000';
  const baseUrl = apiUrl.replace(/\/api$/, '');
  return `${baseUrl}${imageUrl}`;
};

/**
 * Dashboard sayfası
 * Etkinlikler, projeler ve sponsorlar için yönetim tabloları içerir
 */
const Dashboard = () => {
  const navigate = useNavigate();
  
  // State tanımlamaları
  const [activeTab, setActiveTab] = useState('events');
  const [events, setEvents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Güncelleme sayfasına yönlendir
  const handleEditEvent = (event) => {
    navigate('/admin/content', { state: { editMode: 'event', editData: event } });
  };

  const handleEditProject = (project) => {
    navigate('/admin/content', { state: { editMode: 'project', editData: project } });
  };

  const handleEditSponsor = (sponsor) => {
    navigate('/admin/content', { state: { editMode: 'sponsor', editData: sponsor } });
  };

  // Etkinlikleri getir
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const eventsData = await eventService.getAllAdmin({ limit: 100 });
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
      const response = await projectService.getAllAdmin({ limit: 100 });
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

  // Sponsorları getir
  const fetchSponsors = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const sponsorsData = await sponsorService.getAll();
      setSponsors(Array.isArray(sponsorsData) ? sponsorsData : []);
    } catch (err) {
      console.error("Sponsorları getirme hatası:", err);
      setError("Sponsorları getirirken bir hata oluştu.");
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
      await eventService.delete(eventId);
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
      await eventService.update(event.id, { is_active: !event.is_active });
      
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
      await eventService.update(event.id, { is_featured: !event.is_featured });
      
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
      await projectService.delete(projectId);
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
      await projectService.update(project.id, { is_active: !project.is_active });
      
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
      await projectService.update(project.id, { is_featured: !project.is_featured });
      
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

  // Sponsor silme işlemi
  const handleDeleteSponsor = async (sponsorId) => {
    if (!window.confirm("Bu sponsoru silmek istediğinize emin misiniz?")) {
      return;
    }
    
    try {
      await sponsorService.delete(sponsorId);
      setSponsors(sponsors.filter(s => s.id !== sponsorId));
      alert("Sponsor başarıyla silindi!");
    } catch (err) {
      console.error("Sponsor silme hatası:", err);
      alert("Sponsor silinirken bir hata oluştu: " + err.message);
    }
  };
  
  // Sponsor aktiflik durumunu değiştirme
  const handleToggleSponsorActive = async (sponsor) => {
    try {
      await sponsorService.update(sponsor.id, { is_active: !sponsor.is_active });
      setSponsors(sponsors.map(s => s.id === sponsor.id ? { ...s, is_active: !s.is_active } : s));
      alert(`Sponsor ${!sponsor.is_active ? 'aktif' : 'pasif'} duruma getirildi.`);
    } catch (err) {
      console.error("Sponsor güncelleme hatası:", err);
      alert("Sponsor güncellenirken bir hata oluştu: " + err.message);
    }
  };

  // Aktif sekmeye göre veri getir
  useEffect(() => {
    if (activeTab === 'events') {
      fetchEvents();
    } else if (activeTab === 'projects') {
      fetchProjects();
    } else if (activeTab === 'sponsors') {
      fetchSponsors();
    }
  }, [activeTab, fetchEvents, fetchProjects, fetchSponsors]);

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
                <button 
                  onClick={() => setActiveTab('sponsors')} 
                  className={`tab-btn ${activeTab === 'sponsors' ? 'active' : ''}`}
                >
                  Sponsorlar
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
                        <div className="dashboard-table-cell">Görsel</div>
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
                            <div className="dashboard-table-cell">
                              {event.image_url ? (
                                <img 
                                  src={getImageUrl(event.image_url)} 
                                  alt={event.title}
                                  className="table-thumb"
                                  style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }}
                                />
                              ) : (
                                <div 
                                  className="table-thumb-placeholder"
                                  style={{ 
                                    width: '40px', 
                                    height: '40px', 
                                    borderRadius: '8px', 
                                    backgroundColor: '#e0e0e0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    color: '#666',
                                    fontSize: '12px'
                                  }}
                                >
                                  {(event.title || 'E').charAt(0)}
                                </div>
                              )}
                            </div>
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
                                onClick={() => handleEditEvent(event)}
                                className="edit-btn"
                                title="Etkinliği düzenle"
                              >
                                Güncelle
                              </button>
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
                                {event.is_featured ? 'Öne Çıkar' : 'Öne Çıkar'}
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
                        <div className="dashboard-table-cell">Görsel</div>
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
                            <div className="dashboard-table-cell">
                              {project.image_url ? (
                                <img 
                                  src={getImageUrl(project.image_url)} 
                                  alt={project.title}
                                  className="table-thumb"
                                  style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }}
                                />
                              ) : (
                                <div 
                                  className="table-thumb-placeholder"
                                  style={{ 
                                    width: '40px', 
                                    height: '40px', 
                                    borderRadius: '8px', 
                                    backgroundColor: '#e0e0e0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    color: '#666',
                                    fontSize: '12px'
                                  }}
                                >
                                  {(project.title || 'P').charAt(0)}
                                </div>
                              )}
                            </div>
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
                                onClick={() => handleEditProject(project)}
                                className="edit-btn"
                                title="Projeyi düzenle"
                              >
                                Güncelle
                              </button>
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
                                {project.is_featured ? 'Öne Çıkar' : 'Öne Çıkar'}
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

            {activeTab === 'sponsors' && (
              <div className="dashboard-table-container">
                {loading && <p>Sponsorlar yükleniyor...</p>}
                
                {error && <p className="error-message">{error}</p>}
                
                {!loading && !error && (
                  <>
                    <div className="dashboard-table-header">
                      <div className="dashboard-table-row header">
                        <div className="dashboard-table-cell">ID</div>
                        <div className="dashboard-table-cell">Logo</div>
                        <div className="dashboard-table-cell">İsim</div>
                        <div className="dashboard-table-cell">Kategori</div>
                        <div className="dashboard-table-cell">İndirim</div>
                        <div className="dashboard-table-cell">Durum</div>
                        <div className="dashboard-table-cell">İşlemler</div>
                      </div>
                    </div>
                    
                    <div className="dashboard-table-body">
                      {sponsors.length === 0 ? (
                        <p>Sponsor bulunamadı.</p>
                      ) : (
                        sponsors.map((sponsor) => (
                          <div key={sponsor.id} className="dashboard-table-row">
                            <div className="dashboard-table-cell">{sponsor.id}</div>
                            <div className="dashboard-table-cell">
                              {sponsor.image_url ? (
                                <img 
                                  src={getImageUrl(sponsor.image_url)} 
                                  alt={sponsor.name}
                                  className="sponsor-logo-thumb"
                                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                                />
                              ) : (
                                <div 
                                  className="sponsor-logo-placeholder"
                                  style={{ 
                                    width: '40px', 
                                    height: '40px', 
                                    borderRadius: '50%', 
                                    backgroundColor: '#e0e0e0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    color: '#666'
                                  }}
                                >
                                  {sponsor.name?.charAt(0)?.toUpperCase() || 'S'}
                                </div>
                              )}
                            </div>
                            <div className="dashboard-table-cell">{sponsor.name}</div>
                            <div className="dashboard-table-cell">{sponsor.category || '-'}</div>
                            <div className="dashboard-table-cell">{sponsor.discount_info || '-'}</div>
                            <div className="dashboard-table-cell">
                              <span className={`status-badge ${sponsor.is_active ? 'active' : 'inactive'}`}>
                                {sponsor.is_active ? 'Aktif' : 'Pasif'}
                              </span>
                            </div>
                            <div className="dashboard-table-cell actions">
                              <button 
                                onClick={() => handleEditSponsor(sponsor)}
                                className="edit-btn"
                                title="Sponsoru düzenle"
                              >
                                Güncelle
                              </button>
                              <button 
                                onClick={() => handleToggleSponsorActive(sponsor)}
                                className={`status-btn ${sponsor.is_active ? 'deactivate' : 'activate'}`}
                                title={sponsor.is_active ? 'Pasif yap' : 'Aktif yap'}
                              >
                                {sponsor.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                              </button>
                              <button 
                                onClick={() => handleDeleteSponsor(sponsor.id)}
                                className="delete-btn"
                                title="Sponsoru sil"
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
