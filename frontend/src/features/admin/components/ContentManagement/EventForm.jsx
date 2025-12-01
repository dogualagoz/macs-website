import React from 'react';
import { useEventForm, useCategories } from '../../hooks';
import { 
  FormInput, 
  FormTextarea, 
  FormSelect, 
  FormCheckbox, 
  ImageUploader,
  Alert 
} from '../../../../shared/components/ui';

export const EventForm = () => {
  const {
    formData,
    imagePreview,
    loading,
    error,
    submitSuccess,
    handleChange,
    handleImageChange,
    handleSubmit
  } = useEventForm();

  const { categories } = useCategories('event');

  return (
    <div className="form-container">
      <Alert type="success" message={submitSuccess ? 'Etkinlik başarıyla eklendi!' : null} />
      <Alert type="error" message={error} />
      
      <form onSubmit={handleSubmit}>
        <ImageUploader
          label="Etkinlik Görseli"
          preview={imagePreview}
          onChange={handleImageChange}
        />

        <FormInput
          label="Başlık"
          placeholder="Etkinlik başlığı"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          required
        />

        <FormTextarea
          label="Açıklama"
          placeholder="Kısa açıklama"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          required
        />

        <FormInput
          label="Konum"
          placeholder="Etkinlik yeri"
          value={formData.location}
          onChange={(e) => handleChange('location', e.target.value)}
          required
        />

        <FormInput
          label="Tarih"
          type="datetime-local"
          value={formData.date}
          onChange={(e) => handleChange('date', e.target.value)}
          required
        />

        <FormInput
          label="Kayıt Formu Linki"
          type="url"
          placeholder="https://forms.google.com/..."
          value={formData.registrationLink}
          onChange={(e) => handleChange('registrationLink', e.target.value)}
        />

        <FormInput
          label="Yol Tarifi Linki"
          type="url"
          placeholder="https://maps.google.com/..."
          value={formData.directionsLink}
          onChange={(e) => handleChange('directionsLink', e.target.value)}
        />

        <FormSelect
          label="Kategori"
          placeholder="Kategori Seçin"
          value={formData.category}
          onChange={(e) => handleChange('category', e.target.value)}
          options={categories}
        />

        <FormTextarea
          label="İçerik"
          rows={6}
          placeholder="Etkinlik içeriği..."
          value={formData.content}
          onChange={(e) => handleChange('content', e.target.value)}
        />

        <div className="form-group">
          <FormCheckbox
            id="featured"
            label="Öne Çıkar"
            checked={formData.isFeatured}
            onChange={(e) => handleChange('isFeatured', e.target.checked)}
          />
          
          <FormCheckbox
            id="active"
            label="Aktif mi?"
            checked={formData.isActive}
            onChange={(e) => handleChange('isActive', e.target.checked)}
          />
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
  );
};
