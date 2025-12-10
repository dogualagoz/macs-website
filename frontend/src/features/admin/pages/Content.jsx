import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { EventForm, ProjectForm, SponsorForm } from '../components/ContentManagement';

const Content = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('event');
  const [editData, setEditData] = useState(null);

  // Dashboard'dan gelen edit modunu kontrol et
  useEffect(() => {
    if (location.state?.editMode) {
      const { editMode, editData: data } = location.state;
      
      // Tab'ı ayarla
      if (editMode === 'event') {
        setActiveTab('event');
      } else if (editMode === 'project') {
        setActiveTab('project');
      } else if (editMode === 'sponsor') {
        setActiveTab('sponsor');
      }
      
      // Edit data'yı ayarla
      setEditData(data);
      
      // State'i temizle (geri gelince tekrar yüklenmemesi için)
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Tab değiştiğinde edit modunu temizle
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setEditData(null);
  };

  // Güncelleme başarılı olduğunda
  const handleUpdateSuccess = () => {
    setEditData(null);
    navigate('/admin/dashboard');
  };

  // Edit modunu iptal et
  const handleCancelEdit = () => {
    setEditData(null);
  };

  return (
    <div className="admin-container">
      <Sidebar />
      
      <main className="admin-main">
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              {editData ? 'İçerik Güncelle' : 'İçerik Yönetimi'}
            </h2>
            
            <div className="tabs">
              <div className="tabs-list">
                <button 
                  onClick={() => handleTabChange('event')} 
                  className={`tab-btn ${activeTab === 'event' ? 'active' : ''}`}
                >
                  {editData && activeTab === 'event' ? 'Etkinlik Güncelle' : 'Etkinlik Ekle'}
                </button>
                <button 
                  onClick={() => handleTabChange('project')} 
                  className={`tab-btn ${activeTab === 'project' ? 'active' : ''}`}
                >
                  {editData && activeTab === 'project' ? 'Proje Güncelle' : 'Proje Ekle'}
                </button>
                <button 
                  onClick={() => handleTabChange('sponsor')} 
                  className={`tab-btn ${activeTab === 'sponsor' ? 'active' : ''}`}
                >
                  {editData && activeTab === 'sponsor' ? 'Sponsor Güncelle' : 'Sponsor Ekle'}
                </button>
              </div>
            </div>
          </div>
          
          <div className="admin-card-body">
            {activeTab === 'event' && (
              <EventForm 
                editData={activeTab === 'event' ? editData : null} 
                onUpdateSuccess={handleUpdateSuccess}
                onCancelEdit={handleCancelEdit}
              />
            )}
            {activeTab === 'project' && (
              <ProjectForm 
                editData={activeTab === 'project' ? editData : null}
                onUpdateSuccess={handleUpdateSuccess}
                onCancelEdit={handleCancelEdit}
              />
            )}
            {activeTab === 'sponsor' && (
              <SponsorForm 
                editData={activeTab === 'sponsor' ? editData : null}
                onUpdateSuccess={handleUpdateSuccess}
                onCancelEdit={handleCancelEdit}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Content;
