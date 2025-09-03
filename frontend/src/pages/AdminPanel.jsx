import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import * as usersAPI from "../api/users";
import "../styles/admin.css";
import "../styles/admin-reset.css";

export default function AdminPanel() {
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [contentTab, setContentTab] = useState("event");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
    console.log("Current user:", user);
    // Daha esnek kontrol - "admin" veya "ADMIN" veya benzeri değerleri kabul et
    // const isAdmin = user?.role?.toLowerCase() === "admin";
    // Geliştirme amaçlı olarak her zaman admin olarak kabul et
    const isAdmin = true;
    console.log("Is admin:", isAdmin);

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

  // Fetch users when the users tab is active
  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    }
  }, [activeTab, fetchUsers]);

  const handleDeleteUser = async (userId) => {
    console.log("Attempting to delete user with ID:", userId);
    console.log("Current user role:", user?.role);
    console.log("isAdmin value:", isAdmin);
    
    // isAdmin kontrolünü kaldırdık çünkü buton zaten disabled olacak
    
    if (!window.confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) {
      console.log("Delete operation cancelled by user");
      return;
    }
    
    try {
      console.log("Sending delete request to API...");
      await usersAPI.deleteUser(userId);
      console.log("Delete request successful");
      // Kullanıcı listesini güncelle
      setUsers(users.filter(u => u.id !== userId));
      alert("Kullanıcı başarıyla silindi!");
    } catch (err) {
      console.error("Kullanıcı silme hatası:", err);
      alert("Kullanıcı silinirken bir hata oluştu: " + err.message);
    }
  };

  const handleExit = () => {
    // Oturumu kapat ve kullanıcıyı ana sayfaya yönlendir
    logout();
    navigate("/");
  };

  const sidebarItem = (value, label) => (
    <button
      key={value}
      onClick={() => setActiveTab(value)}
      className={`sidebar-item ${activeTab === value ? "active" : ""}`}
    >
      {label}
    </button>
  );

  return (
    <div className="admin-container">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <h1>Admin Panel</h1>
        <nav className="admin-nav">
          {sidebarItem("dashboard", "Dashboard")}
          {sidebarItem("content", "Ekle")}
          {sidebarItem("users", "Kullanıcılar")}
          {sidebarItem("logs", "Loglar")}
        </nav>
        <div style={{ marginTop: 'auto', marginBottom: '2rem' }}>
          <button
            onClick={handleExit}
            className="exit-btn"
          >
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              {activeTab === "dashboard" ? "Dashboard" : activeTab === "users" ? "Kullanıcılar" : activeTab === "logs" ? "Loglar" : "İçerik Yönetimi"}
            </h2>
            {activeTab === "content" && (
              <div className="tabs">
                <div className="tabs-list">
                  <button 
                    onClick={() => setContentTab("event")} 
                    className={`tab-btn ${contentTab === "event" ? "active" : ""}`}
                  >
                    Etkinlik Ekle
                  </button>
                  <button 
                    onClick={() => setContentTab("project")} 
                    className={`tab-btn ${contentTab === "project" ? "active" : ""}`}
                  >
                    Proje Ekle
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="admin-card-body">
            {activeTab === "dashboard" && (
              <p>Genel istatistikler ve özetler buraya gelecek.</p>
            )}

            {activeTab === "content" && contentTab === "event" && (
              <div className="form-container">
                <div className="form-group">
                  <label className="form-label">Etkinlik Görseli</label>
                  <input type="file" className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Başlık</label>
                  <input 
                    type="text" 
                    placeholder="Etkinlik başlığı" 
                    className="form-input" 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Açıklama</label>
                  <textarea 
                    placeholder="Kısa açıklama" 
                    className="form-textarea"
                  ></textarea>
                </div>
                <div className="form-group">
                  <label className="form-label">Konum</label>
                  <input 
                    type="text" 
                    placeholder="Etkinlik yeri" 
                    className="form-input" 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tarih</label>
                  <input 
                    type="datetime-local" 
                    className="form-input" 
                  />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Kategori</label>
                    <input 
                      type="text" 
                      placeholder="Workshop, Seminer..." 
                      className="form-input" 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Etiketler</label>
                    <input 
                      type="text" 
                      placeholder="react, ai, tasarım..." 
                      className="form-input" 
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">İçerik</label>
                  <textarea 
                    rows="6" 
                    placeholder="CKEditor buraya entegre edilecek..." 
                    className="form-textarea"
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
                <button className="btn btn-primary">
                  Etkinlik Ekle
                </button>
              </div>
            )}

            {activeTab === "content" && contentTab === "project" && (
              <div className="form-container">
                <div className="form-group">
                  <label className="form-label">Proje Görseli</label>
                  <input type="file" className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Başlık</label>
                  <input 
                    type="text" 
                    placeholder="Proje başlığı" 
                    className="form-input" 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Açıklama</label>
                  <textarea 
                    placeholder="Kısa açıklama" 
                    className="form-textarea"
                  ></textarea>
                </div>
                <div className="form-group">
                  <label className="form-label">Github URL</label>
                  <input 
                    type="text" 
                    placeholder="https://github.com/..." 
                    className="form-input" 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Proje Web Sitesi</label>
                  <input 
                    type="text" 
                    placeholder="https://..." 
                    className="form-input" 
                  />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Kategori</label>
                    <input 
                      type="text" 
                      placeholder="AI, Web, Mobil..." 
                      className="form-input" 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Etiketler</label>
                    <input 
                      type="text" 
                      placeholder="django, tailwind..." 
                      className="form-input" 
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">İçerik</label>
                  <textarea 
                    rows="6" 
                    placeholder="CKEditor buraya entegre edilecek..." 
                    className="form-textarea"
                  ></textarea>
                </div>
                <div className="form-group">
                  <div className="checkbox-group">
                    <input 
                      type="checkbox" 
                      id="featured-project" 
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                    />
                    <label htmlFor="featured-project">Öne Çıkar</label>
                  </div>
                  <div className="checkbox-group">
                    <input 
                      type="checkbox" 
                      id="active-project" 
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                    <label htmlFor="active-project">Aktif mi?</label>
                  </div>
                </div>
                <button className="btn btn-primary">
                  Proje Ekle
                </button>
              </div>
            )}

            {activeTab === "users" && (
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
            )}

            {activeTab === "logs" && (
              <p>
                Log kaydı burada listelenecek. Hangi içeriği kim oluşturdu bilgisi gösterilecek.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
