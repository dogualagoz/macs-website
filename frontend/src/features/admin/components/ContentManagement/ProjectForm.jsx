import React from 'react';
import { useProjectForm, useCategories } from '../../hooks';
import { 
  FormInput, 
  FormTextarea, 
  FormSelect, 
  FormCheckbox, 
  ImageUploader,
  Alert 
} from '../../../../shared/components/ui';

export const ProjectForm = () => {
  const {
    formData,
    imagePreview,
    loading,
    error,
    submitSuccess,
    handleChange,
    handleImageChange,
    handleSubmit
  } = useProjectForm();

  const { categories } = useCategories('project');

  const statusOptions = [
    { id: 'PLANNING', name: 'Planlama' },
    { id: 'IN_PROGRESS', name: 'Devam Ediyor' },
    { id: 'COMPLETED', name: 'Tamamlandı' },
    { id: 'ON_HOLD', name: 'Beklemede' },
    { id: 'CANCELLED', name: 'İptal Edildi' }
  ];

  return (
    <div className="form-container">
      <Alert type="success" message={submitSuccess ? 'Proje başarıyla eklendi!' : null} />
      <Alert type="error" message={error} />
      
      <form onSubmit={handleSubmit}>
        <ImageUploader
          label="Proje Görseli"
          preview={imagePreview}
          onChange={handleImageChange}
        />

        <FormInput
          label="Başlık"
          placeholder="Proje başlığı"
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
          label="Github URL"
          type="url"
          placeholder="https://github.com/..."
          value={formData.githubUrl}
          onChange={(e) => handleChange('githubUrl', e.target.value)}
        />

        <FormInput
          label="Proje Web Sitesi"
          type="url"
          placeholder="https://..."
          value={formData.liveUrl}
          onChange={(e) => handleChange('liveUrl', e.target.value)}
        />

        <div className="form-grid">
          <FormSelect
            label="Kategori"
            placeholder="Kategori Seçin"
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            options={categories}
          />

          <FormInput
            label="Teknolojiler"
            placeholder="React, Node.js, MongoDB..."
            value={formData.technologies}
            onChange={(e) => handleChange('technologies', e.target.value)}
          />
        </div>

        <FormInput
          label="Takım Üyeleri"
          placeholder="Ayşe Yıldız, Mehmet Demir..."
          value={formData.teamMembers}
          onChange={(e) => handleChange('teamMembers', e.target.value)}
        />

        <FormSelect
          label="Durum"
          value={formData.status}
          onChange={(e) => handleChange('status', e.target.value)}
          options={statusOptions}
        />

        <FormTextarea
          label="İçerik"
          rows={6}
          placeholder="Proje içeriği..."
          value={formData.content}
          onChange={(e) => handleChange('content', e.target.value)}
        />

        <div className="form-group">
          <FormCheckbox
            id="featured-project"
            label="Öne Çıkar"
            checked={formData.isFeatured}
            onChange={(e) => handleChange('isFeatured', e.target.checked)}
          />
          
          <FormCheckbox
            id="active-project"
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
          {loading ? "Ekleniyor..." : "Proje Ekle"}
        </button>
      </form>
    </div>
  );
};
