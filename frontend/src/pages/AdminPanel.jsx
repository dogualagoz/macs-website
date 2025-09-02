import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../styles/admin.css";
import "../styles/admin-reset.css";

export default function AdminPanel() {
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [contentTab, setContentTab] = useState("event");
  const { logout } = useAuth();
  const navigate = useNavigate();
  
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
              <p>
                Kullanıcılar bu panelde listelenecek. Admin kullanıcılar güncelleme ve silme işlemleri yapabilecek. Moderatorler yalnızca görüntüleyebilir.
              </p>
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
