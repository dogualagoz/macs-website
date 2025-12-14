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

export const ProjectForm = ({ editData = null, onUpdateSuccess = null, onCancelEdit = null }) => {
  const {
    formData,
    imagePreview,
    loading,
    error,
    submitSuccess,
    isEditMode,
    handleChange,
    handleImageChange,
    handleSubmit
  } = useProjectForm(editData, onUpdateSuccess);

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
      <Alert type="success" message={submitSuccess ? (isEditMode ? 'Proje başarıyla güncellendi!' : 'Proje başarıyla eklendi!') : null} />
      <Alert type="error" message={error} />
      
      {isEditMode && onCancelEdit && (
        <div className="edit-mode-header" style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fef3c7', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#92400e', fontWeight: '500' }}>
            ✏️ Düzenleme Modu: {formData.title}
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
          {loading ? (isEditMode ? "Güncelleniyor..." : "Ekleniyor...") : (isEditMode ? "Projeyi Güncelle" : "Proje Ekle")}
        </button>
      </form>
    </div>
  );
};
