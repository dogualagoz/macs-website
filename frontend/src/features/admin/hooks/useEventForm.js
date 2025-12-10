import { useState, useEffect } from 'react';
import { eventService } from '../services/contentService';
import { handleApiError } from '../../../shared/utils/errorHandler';
import env from '../../../shared/config/env';

// Backend URL'den /api kısmını çıkar ve image URL ile birleştir
const getImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  const apiUrl = env.apiUrl || 'http://localhost:8000';
  const baseUrl = apiUrl.replace(/\/api$/, '');
  return `${baseUrl}${imageUrl}`;
};

export const useEventForm = (editData = null, onUpdateSuccess = null) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    date: '',
    category: '',
    content: '',
    registrationLink: '',
    directionsLink: '',
    isFeatured: false,
    isActive: true
  });
  
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  // Edit data geldiğinde formu doldur
  useEffect(() => {
    if (editData) {
      setIsEditMode(true);
      setEditId(editData.id);
      
      // Tarih formatını düzenle (datetime-local için)
      let formattedDate = '';
      if (editData.start_time) {
        const date = new Date(editData.start_time);
        formattedDate = date.toISOString().slice(0, 16);
      }
      
      setFormData({
        title: editData.title || '',
        description: editData.description || '',
        location: editData.location || '',
        date: formattedDate,
        category: editData.category_id?.toString() || '',
        content: editData.content || '',
        registrationLink: editData.registration_link || '',
        directionsLink: editData.directions_link || '',
        isFeatured: editData.is_featured || false,
        isActive: editData.is_active ?? true
      });
      
      // Mevcut resmi önizlemeye ekle
      if (editData.image_url) {
        setImagePreview(getImageUrl(editData.image_url));
      }
    } else {
      setIsEditMode(false);
      setEditId(null);
      reset();
    }
  }, [editData]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (file) => {
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSubmitSuccess(false);
    
    try {
      // 1. Görsel yükle (yeni resim seçildiyse)
      let imageUrl = null;
      if (image) {
        imageUrl = await eventService.uploadImage(image);
      }
      
      // 2. Etkinlik verisi hazırla
      const startTimeWithTZ = formData.date + ':00+03:00';
      const eventData = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        registration_link: formData.registrationLink || null,
        directions_link: formData.directionsLink || null,
        start_time: startTimeWithTZ,
        category_id: formData.category !== '' ? parseInt(formData.category) : null,
        content: formData.content,
        is_featured: formData.isFeatured,
        is_active: formData.isActive
      };
      
      // Sadece yeni resim yüklendiyse image_url ekle
      if (imageUrl) {
        eventData.image_url = imageUrl;
      }
      
      if (isEditMode && editId) {
        // Güncelleme
        await eventService.update(editId, eventData);
        setSubmitSuccess(true);
        
        if (onUpdateSuccess) {
          setTimeout(() => {
            onUpdateSuccess();
          }, 1500);
        }
      } else {
        // Yeni oluşturma
        await eventService.create(eventData);
        setSubmitSuccess(true);
        reset();
      }
      
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
      
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFormData({
      title: '',
      description: '',
      location: '',
      date: '',
      category: '',
      content: '',
      registrationLink: '',
      directionsLink: '',
      isFeatured: false,
      isActive: true
    });
    setImage(null);
    setImagePreview(null);
  };

  return {
    formData,
    image,
    imagePreview,
    loading,
    error,
    submitSuccess,
    isEditMode,
    handleChange,
    handleImageChange,
    handleSubmit,
    reset
  };
};
