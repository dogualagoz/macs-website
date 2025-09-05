import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/admin/Sidebar';
import * as usersAPI from '../../api/users';

/**
 * Kullanıcılar Sayfası
 * Kullanıcı listesi ve kullanıcı yönetimi işlemleri içerir
 */
const Users = () => {
  // State tanımlamaları
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Kullanıcıları getir
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await usersAPI.getAllUsers();
      // API'den gelen yanıt yapısını kontrol et
      if (response.users) {
        // Eğer response.users varsa, bu bir dizi olmalı
        setUsers(response.users);
      } else {
        // Eğer direkt dizi dönüyorsa
        setUsers(Array.isArray(response) ? response : []);
      }
    } catch (err) {
      console.error("Kullanıcıları getirme hatası:", err);
      setError("Kullanıcıları getirirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Kullanıcı silme işlemi
  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) {
      return;
    }
    
    try {
      await usersAPI.deleteUser(userId);
      // Kullanıcı listesini güncelle
      setUsers(users.filter(u => u.id !== userId));
      alert("Kullanıcı başarıyla silindi!");
    } catch (err) {
      console.error("Kullanıcı silme hatası:", err);
      alert("Kullanıcı silinirken bir hata oluştu: " + err.message);
    }
  };

  // Sayfa yüklendiğinde kullanıcıları getir
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="admin-container">
      <Sidebar />
      
      <main className="admin-main">
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">Kullanıcılar</h2>
          </div>
          
          <div className="admin-card-body">
            <div className="users-container">
              {loading && <p>Kullanıcılar yükleniyor...</p>}
              
              {error && <p className="error-message">{error}</p>}
              
              {!loading && !error && (
                <>
                  <div className="users-table-header">
                    <div className="users-table-row header">
                      <div className="users-table-cell">ID</div>
                      <div className="users-table-cell">Kullanıcı Adı</div>
                      <div className="users-table-cell">E-posta</div>
                      <div className="users-table-cell">Rol</div>
                      <div className="users-table-cell">İşlemler</div>
                    </div>
                  </div>
                  
                  <div className="users-table-body">
                    {users.length === 0 ? (
                      <p>Kullanıcı bulunamadı.</p>
                    ) : (
                      users.map((userItem) => (
                        <div key={userItem.id} className="users-table-row">
                          <div className="users-table-cell">{userItem.id}</div>
                          <div className="users-table-cell">{userItem.full_name || userItem.username || '-'}</div>
                          <div className="users-table-cell">{userItem.email}</div>
                          <div className="users-table-cell">{userItem.role}</div>
                          <div className="users-table-cell actions">
                            <button 
                              onClick={() => handleDeleteUser(userItem.id)}
                              className="delete-btn"
                              disabled={false} // Geçici olarak tüm butonları aktif yapıyoruz
                              title={"Kullanıcıyı sil"}
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

export default Users;
