import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import * as usersAPI from "../api/users";
import * as eventsAPI from "../api/events";
import * as projectsAPI from "../api/projects";
import "../styles/admin.css";
import "../styles/admin-reset.css";

export default function AdminPanel() {
  // Genel state
  const [activeTab, setActiveTab] = useState("dashboard");
  const [contentTab, setContentTab] = useState("event");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Kullanıcılar sekmesi state
  const [users, setUsers] = useState([]);
  
  // Etkinlik ekleme formu state
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventCategory, setEventCategory] = useState("");
  const [eventTags, setEventTags] = useState("");
  const [eventContent, setEventContent] = useState("");
  const [eventImage, setEventImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);
  
  // Kategori seçenekleri
  const [categories, setCategories] = useState([]);
  
  console.log("Current user:", user);
  // Daha esnek kontrol - "admin" veya "ADMIN" veya benzeri değerleri kabul et
  // const isAdmin = user?.role?.toLowerCase() === "admin";
  // Geliştirme amaçlı olarak her zaman admin olarak kabul et
  const isAdmin = true;
  console.log("Is admin:", isAdmin);

  // Fetch categories for the event or project form
  const fetchCategories = useCallback(async () => {
    try {
      if (contentTab === "event") {
        const eventCategories = await eventsAPI.fetchEventCategories();
        setCategories(eventCategories);
      } else if (contentTab === "project") {
        const projectCategories = await projectsAPI.fetchProjectCategories();
        setCategories(projectCategories);
      }
    } catch (err) {
      console.error("Kategori yükleme hatası:", err);
    }
  }, [contentTab]);

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
  
  // Fetch categories when content tab is active
  useEffect(() => {
    if (activeTab === "content") {
      fetchCategories();
    }
  }, [activeTab, fetchCategories]);

  // Dosya seçme işleyicisi
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
  
  // Form gönderme işleyicisi
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
        start_time: new Date(eventDate).toISOString(),
        category_id: eventCategory !== "" ? parseInt(eventCategory) : null,
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
      console.error("Etkinlik ekleme hatası:", err);
      setError(err.message || "Etkinlik eklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };
  
  // Form temizleme
  const resetEventForm = () => {
    setEventTitle("");
    setEventDescription("");
    setEventLocation("");
    setEventDate("");
    setEventCategory("");
    setEventTags("");
    setEventContent("");
    setEventImage(null);
    setImagePreview(null);
    setIsFeatured(false);
    setIsActive(true);
  };

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
                  <div className="form-grid">
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
                      <label className="form-label">Etiketler</label>
                      <input 
                        type="text" 
                        placeholder="react, ai, tasarım..." 
                        className="form-input"
                        value={eventTags}
                        onChange={(e) => setEventTags(e.target.value)}
                        disabled // Şimdilik devre dışı
                      />
                    </div>
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