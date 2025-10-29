import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/admin/Sidebar';
import * as eventsAPI from '../../api/events';
import * as projectsAPI from '../../api/projects';

/**
 * İçerik Ekleme Sayfası
 * Etkinlik ve proje ekleme formlarını içerir
 */
const Content = () => {
  // Aktif sekme state'i
  const [activeTab, setActiveTab] = useState('event');
  
  // Ortak state'ler
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [categories, setCategories] = useState([]);
  
  // Etkinlik ekleme formu state'leri
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventCategory, setEventCategory] = useState('');
  const [eventContent, setEventContent] = useState('');
  const [eventImage, setEventImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [eventRegistrationLink, setEventRegistrationLink] = useState('');
  const [eventDirectionsLink, setEventDirectionsLink] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);
  
  // Proje ekleme formu state'leri
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectContent, setProjectContent] = useState('');
  const [projectImage, setProjectImage] = useState(null);
  const [projectImagePreview, setProjectImagePreview] = useState(null);
  const [projectCategory, setProjectCategory] = useState('');
  const [projectTechnologies, setProjectTechnologies] = useState('');
  const [projectGithubUrl, setProjectGithubUrl] = useState('');
  const [projectLiveUrl, setProjectLiveUrl] = useState('');
  const [projectTeamMembers, setProjectTeamMembers] = useState('');
  const [projectStatus, setProjectStatus] = useState('PLANNING');
  const [projectIsFeatured, setProjectIsFeatured] = useState(false);
  const [projectIsActive, setProjectIsActive] = useState(true);

  // Kategorileri getir
  const fetchCategories = useCallback(async () => {
    try {
      if (activeTab === 'event') {
        const eventCategories = await eventsAPI.fetchEventCategories();
        setCategories(eventCategories);
      } else if (activeTab === 'project') {
        const projectCategories = await projectsAPI.fetchProjectCategories();
        setCategories(projectCategories);
      }
    } catch (err) {
      console.error('Kategori yükleme hatası:', err);
      setError('Kategoriler yüklenirken bir hata oluştu.');
    }
  }, [activeTab]);

  // Aktif sekme değiştiğinde kategorileri getir
  useEffect(() => {
    fetchCategories();
  }, [activeTab, fetchCategories]);

  // Etkinlik görseli seçme işleyicisi
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEventImage(file);
      
      // Önizleme için
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Proje görseli seçme işleyicisi
  const handleProjectImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProjectImage(file);
      
      // Önizleme için
      const reader = new FileReader();
      reader.onloadend = () => {
        setProjectImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Etkinlik formu gönderme işleyicisi
  const handleEventSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSubmitSuccess(false);
    
    try {
      // 1. Önce görsel varsa yükle
      let imageUrl = null;
      if (eventImage) {
        const uploadResponse = await eventsAPI.uploadFile(eventImage);
        imageUrl = uploadResponse.url;
      }
      
      // 2. Etkinlik verilerini hazırla
      const eventData = {
        title: eventTitle,
        description: eventDescription,
        location: eventLocation,
        registration_link: eventRegistrationLink || null,
        directions_link: eventDirectionsLink || null,
        start_time: new Date(eventDate).toISOString(),
        category_id: eventCategory !== '' ? parseInt(eventCategory) : null,
        content: eventContent,
        image_url: imageUrl,
        is_featured: isFeatured,
        is_active: isActive
      };
      
      // 3. Etkinliği oluştur
      await eventsAPI.createEvent(eventData);
      
      // 4. Başarılı mesajı göster ve formu temizle
      setSubmitSuccess(true);
      resetEventForm();
      
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
      
    } catch (err) {
      console.error('Etkinlik ekleme hatası:', err);
      setError(err.message || 'Etkinlik eklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Proje formu gönderme işleyicisi
  const handleProjectSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSubmitSuccess(false);
    
    try {
      // 1. Önce görsel varsa yükle
      let imageUrl = null;
      if (projectImage) {
        const uploadResponse = await eventsAPI.uploadFile(projectImage);
        imageUrl = uploadResponse.url;
      }
      
      // 2. Proje verilerini hazırla
      const projectData = {
        title: projectTitle,
        description: projectDescription,
        content: projectContent,
        image_url: imageUrl,
        technologies: projectTechnologies,
        github_url: projectGithubUrl,
        live_url: projectLiveUrl,
        status: projectStatus,
        category_id: projectCategory !== '' ? parseInt(projectCategory) : null,
        team_members: projectTeamMembers,
        is_featured: projectIsFeatured,
        is_active: projectIsActive
      };
      
      // 3. Projeyi oluştur
      await projectsAPI.createProject(projectData);
      
      // 4. Başarılı mesajı göster ve formu temizle
      setSubmitSuccess(true);
      resetProjectForm();
      
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
      
    } catch (err) {
      console.error('Proje ekleme hatası:', err);
      setError(err.message || 'Proje eklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Etkinlik formu temizleme
  const resetEventForm = () => {
    setEventTitle('');
    setEventDescription('');
    setEventLocation('');
    setEventDate('');
    setEventCategory('');
    setEventContent('');
    setEventImage(null);
    setImagePreview(null);
    setEventRegistrationLink('');
    setEventDirectionsLink('');
    setIsFeatured(false);
    setIsActive(true);
  };
  
  // Proje formu temizleme
  const resetProjectForm = () => {
    setProjectTitle('');
    setProjectDescription('');
    setProjectContent('');
    setProjectImage(null);
    setProjectImagePreview(null);
    setProjectCategory('');
    setProjectTechnologies('');
    setProjectGithubUrl('');
    setProjectLiveUrl('');
    setProjectTeamMembers('');
    setProjectStatus('PLANNING');
    setProjectIsFeatured(false);
    setProjectIsActive(true);
  };

  return (
    <div className="admin-container">
      <Sidebar />
      
      <main className="admin-main">
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">İçerik Yönetimi</h2>
            
            <div className="tabs">
              <div className="tabs-list">
                <button 
                  onClick={() => setActiveTab('event')} 
                  className={`tab-btn ${activeTab === 'event' ? 'active' : ''}`}
                >
                  Etkinlik Ekle
                </button>
                <button 
                  onClick={() => setActiveTab('project')} 
                  className={`tab-btn ${activeTab === 'project' ? 'active' : ''}`}
                >
                  Proje Ekle
                </button>
              </div>
            </div>
          </div>
          
          <div className="admin-card-body">
            {/* Etkinlik Ekleme Formu */}
            {activeTab === 'event' && (
              <div className="form-container">
                {submitSuccess && (
                  <div className="success-message">
                    Etkinlik başarıyla eklendi!
                  </div>
                )}
                
                {error && (
                  <div className="error-message">
                    {error}
                  </div>
                )}
                
                <form onSubmit={handleEventSubmit}>
                  <div className="form-group">
                    <label className="form-label">Etkinlik Görseli</label>
                    <input 
                      type="file" 
                      className="form-input" 
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                    {imagePreview && (
                      <div className="image-preview">
                        <img src={imagePreview} alt="Önizleme" style={{maxHeight: "200px", marginTop: "10px"}} />
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Başlık</label>
                    <input 
                      type="text" 
                      placeholder="Etkinlik başlığı" 
                      className="form-input"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Açıklama</label>
                    <textarea 
                      placeholder="Kısa açıklama" 
                      className="form-textarea"
                      value={eventDescription}
                      onChange={(e) => setEventDescription(e.target.value)}
                      required
                    ></textarea>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Konum</label>
                    <input 
                      type="text" 
                      placeholder="Etkinlik yeri" 
                      className="form-input"
                      value={eventLocation}
                      onChange={(e) => setEventLocation(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tarih</label>
                    <input 
                      type="datetime-local" 
                      className="form-input"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kayıt Formu Linki</label>
                    <input 
                      type="url" 
                      placeholder="https://forms.google.com/..." 
                      className="form-input"
                      value={eventRegistrationLink}
                      onChange={(e) => setEventRegistrationLink(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Yol Tarifi Linki</label>
                    <input 
                      type="url" 
                      placeholder="https://maps.google.com/..." 
                      className="form-input"
                      value={eventDirectionsLink}
                      onChange={(e) => setEventDirectionsLink(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kategori</label>
                    <select
                      className="form-input"
                      value={eventCategory}
                      onChange={(e) => setEventCategory(e.target.value)}
                    >
                      <option value="">Kategori Seçin</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">İçerik</label>
                    <textarea 
                      rows="6" 
                      placeholder="Etkinlik içeriği..." 
                      className="form-textarea"
                      value={eventContent}
                      onChange={(e) => setEventContent(e.target.value)}
                    ></textarea>
                  </div>
                  <div className="form-group">
                    <div className="checkbox-group">
                      <input 
                        type="checkbox" 
                        id="featured" 
                        checked={isFeatured}
                        onChange={(e) => setIsFeatured(e.target.checked)}
                      />
                      <label htmlFor="featured">Öne Çıkar</label>
                    </div>
                    <div className="checkbox-group">
                      <input 
                        type="checkbox" 
                        id="active" 
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                      />
                      <label htmlFor="active">Aktif mi?</label>
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? "Ekleniyor..." : "Etkinlik Ekle"}
                  </button>
                </form>
              </div>
            )}

            {/* Proje Ekleme Formu */}
            {activeTab === 'project' && (
              <div className="form-container">
                {submitSuccess && (
                  <div className="success-message">
                    Proje başarıyla eklendi!
                  </div>
                )}
                
                {error && (
                  <div className="error-message">
                    {error}
                  </div>
                )}
                
                <form onSubmit={handleProjectSubmit}>
                  <div className="form-group">
                    <label className="form-label">Proje Görseli</label>
                    <input 
                      type="file" 
                      className="form-input" 
                      accept="image/*"
                      onChange={handleProjectImageChange}
                    />
                    {projectImagePreview && (
                      <div className="image-preview">
                        <img src={projectImagePreview} alt="Önizleme" style={{maxHeight: "200px", marginTop: "10px"}} />
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Başlık</label>
                    <input 
                      type="text" 
                      placeholder="Proje başlığı" 
                      className="form-input"
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Açıklama</label>
                    <textarea 
                      placeholder="Kısa açıklama" 
                      className="form-textarea"
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      required
                    ></textarea>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Github URL</label>
                    <input 
                      type="url" 
                      placeholder="https://github.com/..." 
                      className="form-input"
                      value={projectGithubUrl}
                      onChange={(e) => setProjectGithubUrl(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Proje Web Sitesi</label>
                    <input 
                      type="url" 
                      placeholder="https://..." 
                      className="form-input"
                      value={projectLiveUrl}
                      onChange={(e) => setProjectLiveUrl(e.target.value)}
                    />
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Kategori</label>
                      <select
                        className="form-input"
                        value={projectCategory}
                        onChange={(e) => setProjectCategory(e.target.value)}
                      >
                        <option value="">Kategori Seçin</option>
                        {categories.map(category => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Teknolojiler</label>
                      <input 
                        type="text" 
                        placeholder="React, Node.js, MongoDB..." 
                        className="form-input"
                        value={projectTechnologies}
                        onChange={(e) => setProjectTechnologies(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Takım Üyeleri</label>
                    <input 
                      type="text" 
                      placeholder="Ayşe Yıldız, Mehmet Demir..." 
                      className="form-input"
                      value={projectTeamMembers}
                      onChange={(e) => setProjectTeamMembers(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Durum</label>
                    <select
                      className="form-input"
                      value={projectStatus}
                      onChange={(e) => setProjectStatus(e.target.value)}
                    >
                      <option value="PLANNING">Planlama</option>
                      <option value="IN_PROGRESS">Devam Ediyor</option>
                      <option value="COMPLETED">Tamamlandı</option>
                      <option value="ON_HOLD">Beklemede</option>
                      <option value="CANCELLED">İptal Edildi</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">İçerik</label>
                    <textarea 
                      rows="6" 
                      placeholder="Proje içeriği..." 
                      className="form-textarea"
                      value={projectContent}
                      onChange={(e) => setProjectContent(e.target.value)}
                    ></textarea>
                  </div>
                  <div className="form-group">
                    <div className="checkbox-group">
                      <input 
                        type="checkbox" 
                        id="featured-project" 
                        checked={projectIsFeatured}
                        onChange={(e) => setProjectIsFeatured(e.target.checked)}
                      />
                      <label htmlFor="featured-project">Öne Çıkar</label>
                    </div>
                    <div className="checkbox-group">
                      <input 
                        type="checkbox" 
                        id="active-project" 
                        checked={projectIsActive}
                        onChange={(e) => setProjectIsActive(e.target.checked)}
                      />
                      <label htmlFor="active-project">Aktif mi?</label>
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? "Ekleniyor..." : "Proje Ekle"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Content;
