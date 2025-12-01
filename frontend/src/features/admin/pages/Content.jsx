import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { EventForm, ProjectForm } from '../components/ContentManagement';

/**
 * İçerik Yönetimi Sayfası
 * Event ve Project ekleme formlarını yönetir
 */
const Content = () => {
  const [activeTab, setActiveTab] = useState('event');

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
            {activeTab === 'event' && <EventForm />}
            {activeTab === 'project' && <ProjectForm />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Content;
