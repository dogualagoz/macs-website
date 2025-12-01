import { useState } from 'react';
import { eventService } from '../services/contentService';
import { handleApiError } from '../../../shared/utils/errorHandler';

export const useEventForm = () => {
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
      // 1. Görsel yükle
      let imageUrl = null;
      if (image) {
        imageUrl = await eventService.uploadImage(image);
      }
      
      // 2. Etkinlik oluştur
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
        image_url: imageUrl,
        is_featured: formData.isFeatured,
        is_active: formData.isActive
      };
      
      await eventService.create(eventData);
      
      // 3. Başarılı
      setSubmitSuccess(true);
      reset();
      
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
    handleChange,
    handleImageChange,
    handleSubmit
  };
};
