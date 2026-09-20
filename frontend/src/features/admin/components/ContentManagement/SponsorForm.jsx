import React, { useState } from 'react';
import { useSponsorForm } from '../../hooks';
import { 
  FormInput, 
  FormTextarea, 
  FormCheckbox, 
  ImageUploader,
  Alert 
} from '../../../../shared/components/ui';

export const SponsorForm = ({ editData = null, onUpdateSuccess = null, onCancelEdit = null }) => {
  const {
    formData,
    imagePreview,
    loading,
    geocoding,
    error,
    submitSuccess,
    isEditMode,
    handleChange,
    handleImageChange,
    handleGeocode,
    handleSubmit
  } = useSponsorForm(editData, onUpdateSuccess);

  const [copied, setCopied] = useState(false);

  const categoryOptions = [
    'Kafe',
    'Restoran',
    'Teknoloji',
    'Eğitim',
    'Spor',
    'Sağlık',
    'Eğlence',
    'Alışveriş',
    'Diğer'
  ];

  const googleMapsCoords = formData.latitude && formData.longitude 
    ? `${formData.latitude}, ${formData.longitude}` 
    : '';

  const googleMapsLink = formData.latitude && formData.longitude
    ? `https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`
    : '';

  const copyToClipboard = () => {
    if (googleMapsCoords) {
      navigator.clipboard.writeText(googleMapsCoords);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="form-container">
      <Alert type="success" message={submitSuccess ? (isEditMode ? 'Sponsor başarıyla güncellendi!' : 'Sponsor başarıyla eklendi!') : null} />
      <Alert type="error" message={error} />
      
      {isEditMode && onCancelEdit && (
        <div className="edit-mode-header" style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fef3c7', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#92400e', fontWeight: '500' }}>
            ✏️ Düzenleme Modu: {formData.name}
          </span>
          <button 
            type="button" 
            onClick={onCancelEdit}
            style={{ padding: '0.25rem 0.75rem', backgroundColor: '#fbbf24', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: '500' }}
          >
            İptal
          </button>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <ImageUploader
          label="Sponsor Logosu"
          preview={imagePreview}
          onChange={handleImageChange}
        />

        <FormInput
          label="Sponsor Adı"
          placeholder="Sponsor / İşletme adı"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          required
        />

        <FormTextarea
          label="Açıklama"
          placeholder="Sponsor hakkında kısa açıklama"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
        />

        <div className="form-group">
          <label className="form-label">Kategori <span className="required">*</span></label>
          <select
            className="form-input"
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            required
          >
            <option value="">Kategori Seçin</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <FormTextarea
          label="İndirim Bilgisi"
          placeholder="Örn: MACS üyelerine %20 indirim"
          value={formData.discountInfo}
          onChange={(e) => handleChange('discountInfo', e.target.value)}
          rows={2}
        />

        <div className="form-section">
          <h4 className="form-section-title">Konum Bilgileri</h4>
          <p className="form-section-hint">
            Opsiyonel. Fiziksel adresi olmayan kurumsal sponsorlarda boş bırakın —
            sponsor listede görünür, haritada gösterilmez.
          </p>
          
          <div className="address-input-group">
            <FormInput
              label="Adres"
              placeholder="Eskişehir, Odunpazarı..."
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
            />
            <button 
              type="button" 
              className="btn btn-secondary geocode-btn"
              onClick={handleGeocode}
              disabled={geocoding || !formData.address}
            >
              {geocoding ? 'Alınıyor...' : 'Koordinat Al'}
            </button>
          </div>

          <div className="form-grid">
            <FormInput
              label="Enlem (Latitude)"
              type="number"
              step="any"
              placeholder="39.7767"
              value={formData.latitude}
              onChange={(e) => handleChange('latitude', e.target.value)}
            />
            <FormInput
              label="Boylam (Longitude)"
              type="number"
              step="any"
              placeholder="30.5206"
              value={formData.longitude}
              onChange={(e) => handleChange('longitude', e.target.value)}
            />
          </div>

          {googleMapsCoords && (
            <div className="coords-preview">
              <div className="coords-display">
                <span className="coords-label">Google Maps Format:</span>
                <code className="coords-value">{googleMapsCoords}</code>
                <button 
                  type="button" 
                  className="btn-copy"
                  onClick={copyToClipboard}
                  title="Kopyala"
                >
                  {copied ? '✓ Kopyalandı' : 'Kopyala'}
                </button>
              </div>
              <div className="coords-actions">
                <a 
                  href={googleMapsLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-map-link"
                >
                  Google Maps'te Aç
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="form-group">
          <FormCheckbox
            id="active-sponsor"
            label="Aktif mi?"
            checked={formData.isActive}
            onChange={(e) => handleChange('isActive', e.target.checked)}
          />
          <FormCheckbox
            id="featured-sponsor"
            label="Öne çıkar (sponsorlar sayfasının en üstünde büyük gösterilir)"
            checked={formData.isFeatured}
            onChange={(e) => handleChange('isFeatured', e.target.checked)}
          />
        </div>

        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? (isEditMode ? "Güncelleniyor..." : "Ekleniyor...") : (isEditMode ? "Sponsoru Güncelle" : "Sponsor Ekle")}
        </button>
      </form>
    </div>
  );
};
