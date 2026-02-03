import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { memberService } from '../../../shared/services/api';
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
 * Üyeler Sayfası
 * Üye listesi ve üye yönetimi işlemleri içerir
 */
const Members = () => {
  const navigate = useNavigate();
  
  // State tanımlamaları
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Üyeleri getir
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await memberService.getAll();
      setMembers(Array.isArray(response) ? response : []);
    } catch (err) {
      console.error("Üyeleri getirme hatası:", err);
      setError("Üyeleri getirirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Üye silme işlemi
  const handleDeleteMember = async (memberId) => {
    if (!window.confirm("Bu üyeyi kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) {
      return;
    }
    
    try {
      setLoading(true);
      await memberService.delete(memberId);
      // Üye listesini lokal state'den hemen temizle
      setMembers(prevMembers => prevMembers.filter(m => m.id !== memberId));
      alert("Üye başarıyla silindi!");
    } catch (err) {
      console.error("Üye silme hatası:", err);
      const errorMsg = err.response?.data?.detail || err.message || "Bilinmeyen bir hata oluştu";
      alert("Üye silinirken bir hata oluştu: " + errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  // Üye aktiflik durumunu değiştirme
  const handleToggleMemberActive = async (member) => {
    try {
      await memberService.update(member.id, { is_active: !member.is_active });
      // Üye listesini güncelle
      setMembers(members.map(m => m.id === member.id ? { ...m, is_active: !m.is_active } : m));
      alert(`Üye ${!member.is_active ? 'aktif' : 'pasif'} duruma getirildi.`);
    } catch (err) {
      console.error("Üye güncelleme hatası:", err);
      alert("Üye güncellenirken bir hata oluştu: " + err.message);
    }
  };

  const handleEditMember = (member) => {
    navigate('/admin/content', { state: { editMode: 'member', editData: member } });
  };

  // Sayfa yüklendiğinde üyeleri getir
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return (
    <div className="admin-container">
      <Sidebar />
      
      <main className="admin-main">
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">Üyeler</h2>
            <button 
              onClick={() => navigate('/admin/content', { state: { activeTab: 'member' } })}
              className="btn btn-primary"
            >
              Yeni Üye Ekle
            </button>
          </div>
          
          <div className="admin-card-body">
            <div className="dashboard-table-container">
              {loading && <p>Üyeler yükleniyor...</p>}
              
              {error && <p className="error-message">{error}</p>}
              
              {!loading && !error && (
                <>
                  <div className="dashboard-table-header">
                    <div className="dashboard-table-row header">
                      <div className="dashboard-table-cell">ID</div>
                      <div className="dashboard-table-cell">Fotoğraf</div>
                      <div className="dashboard-table-cell">Ad Soyad</div>
                      <div className="dashboard-table-cell">Durum</div>
                      <div className="dashboard-table-cell">İşlemler</div>
                    </div>
                  </div>
                  
                  <div className="dashboard-table-body">
                    {members.length === 0 ? (
                      <p>Üye bulunamadı.</p>
                    ) : (
                      members.map((member) => (
                        <div key={member.id} className="dashboard-table-row">
                          <div className="dashboard-table-cell">{member.id}</div>
                          <div className="dashboard-table-cell">
                            {member.profile_image ? (
                              <img 
                                src={getImageUrl(member.profile_image)} 
                                alt={member.full_name}
                                className="table-thumb"
                                style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div 
                                className="table-thumb-placeholder"
                                style={{ 
                                  width: '40px', 
                                  height: '40px', 
                                  borderRadius: '50%', 
                                  backgroundColor: '#e0e0e0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 'bold',
                                  color: '#666',
                                  fontSize: '12px'
                                }}
                              >
                                {member.full_name?.charAt(0) || 'M'}
                              </div>
                            )}
                          </div>
                          <div className="dashboard-table-cell">{member.full_name}</div>
                          <div className="dashboard-table-cell">
                            <span className={`status-badge ${member.is_active ? 'active' : 'inactive'}`}>
                              {member.is_active ? 'Aktif' : 'Pasif'}
                            </span>
                          </div>
                          <div className="dashboard-table-cell actions">
                            <button 
                              onClick={() => handleEditMember(member)}
                              className="edit-btn"
                              title="Üyeyi düzenle"
                            >
                              Güncelle
                            </button>
                            <button 
                              onClick={() => handleToggleMemberActive(member)}
                              className={`status-btn ${member.is_active ? 'deactivate' : 'activate'}`}
                              title={member.is_active ? 'Pasif yap' : 'Aktif yap'}
                            >
                              {member.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                            </button>
                            <button 
                              onClick={() => handleDeleteMember(member.id)}
                              className="delete-btn"
                              title="Üyeyi sil"
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
          </div>
        </div>
      </main>
    </div>
  );
};

export default Members;
