import { useState, useEffect } from 'react';
import { memberService } from '../../../shared/services/api';

export const useMemberForm = (editData = null, onSuccess = null) => {
  const [formData, setFormData] = useState({
    fullName: '',
    profileImage: '',
    isActive: true
  });

  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const isEditMode = !!editData;

  useEffect(() => {
    if (editData) {
      setFormData({
        fullName: editData.full_name || '',
        profileImage: editData.profile_image || '',
        isActive: editData.is_active !== undefined ? editData.is_active : true
      });
      
      if (editData.profile_image) {
        // Backend URL'den /api kısmını çıkar ve image URL ile birleştir
        const getImageUrl = (imageUrl) => {
          if (!imageUrl) return null;
          if (imageUrl.startsWith('http')) return imageUrl;
          const baseUrl = (process.env.REACT_APP_API_URL || 'http://localhost:8000').replace(/\/api$/, '');
          return `${baseUrl}${imageUrl}`;
        };
        setImagePreview(getImageUrl(editData.profile_image));
      }
    }
  }, [editData]);

  const handleChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = async (file) => {
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      
      // Dosya önizlemesi
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Sunucuya yükle
      const imageUrl = await memberService.uploadImage(file);
      handleChange('profileImage', imageUrl);
      
    } catch (err) {
      console.error("Resim yükleme hatası:", err);
      setError("Resim yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSubmitSuccess(false);

    try {
      const payload = {
        full_name: formData.fullName,
        profile_image: formData.profileImage,
        is_active: formData.isActive
      };

      if (isEditMode) {
        await memberService.update(editData.id, payload);
      } else {
        await memberService.create(payload);
      }

      setSubmitSuccess(true);
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
      
      if (!isEditMode) {
        setFormData({
          fullName: '',
          profileImage: '',
          isActive: true
        });
        setImagePreview(null);
      }
    } catch (err) {
      console.error("Üye kaydetme hatası:", err);
      setError(err.response?.data?.detail || "Üye kaydedilirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    imagePreview,
    loading,
    error,
    submitSuccess,
    isEditMode,
    handleChange,
    handleImageChange,
    handleSubmit
  };
};
