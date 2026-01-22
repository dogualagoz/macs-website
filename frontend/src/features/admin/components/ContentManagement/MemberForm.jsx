import React from 'react';
import { useMemberForm } from '../../hooks';
import { 
  FormInput, 
  FormCheckbox, 
  ImageUploader,
  Alert 
} from '../../../../shared/components/ui';

export const MemberForm = ({ editData = null, onUpdateSuccess = null, onCancelEdit = null }) => {
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
  } = useMemberForm(editData, onUpdateSuccess);

  return (
    <div className="form-container">
      <Alert type="success" message={submitSuccess ? (isEditMode ? 'Üye başarıyla güncellendi!' : 'Üye başarıyla eklendi!') : null} />
      <Alert type="error" message={error} />
      
      {isEditMode && onCancelEdit && (
        <div className="edit-mode-header" style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fef3c7', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#92400e', fontWeight: '500' }}>
            ✏️ Düzenleme Modu: {formData.fullName}
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
          label="Profil Fotoğrafı"
          preview={imagePreview}
          onChange={handleImageChange}
        />

        <FormInput
          label="Ad Soyad"
          placeholder="Üye ad soyad"
          value={formData.fullName}
          onChange={(e) => handleChange('fullName', e.target.value)}
          required
        />

        <div className="form-group">
          <FormCheckbox
            id="active-member"
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
          {loading ? (isEditMode ? "Güncelleniyor..." : "Ekleniyor...") : (isEditMode ? "Üyeyi Güncelle" : "Üye Ekle")}
        </button>
      </form>
    </div>
  );
};
