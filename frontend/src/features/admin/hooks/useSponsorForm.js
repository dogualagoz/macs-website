import { useState } from 'react';
import sponsorService from '../../../shared/services/api/sponsorService';
import { handleApiError } from '../../../shared/utils/errorHandler';

export const useSponsorForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    discountInfo: '',
    address: '',
    latitude: '',
    longitude: '',
    isActive: true
  });
  
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
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

  const handleGeocode = async () => {
    if (!formData.address || formData.address.trim().length < 3) {
      setError('Geçerli bir adres girin');
      return;
    }

    setGeocoding(true);
    setError(null);

    try {
      const result = await sponsorService.geocode(formData.address);
      setFormData(prev => ({
        ...prev,
        latitude: result.latitude.toString(),
        longitude: result.longitude.toString(),
        address: result.formatted_address || prev.address
      }));
    } catch (err) {
      setError('Koordinatlar alınamadı. Lütfen manuel girin.');
    } finally {
      setGeocoding(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSubmitSuccess(false);
    
    try {
      // validasyon
      if (!formData.name || !formData.category || !formData.discountInfo) {
        throw new Error('Lütfen zorunlu alanları doldurun');
      }

      if (!formData.latitude || !formData.longitude) {
        throw new Error('Koordinat bilgisi gerekli. Adres girin ve "Koordinat Al" butonuna tıklayın veya manuel girin.');
      }

      // görsel yükle
      let imageUrl = null;
      if (image) {
        imageUrl = await sponsorService.uploadImage(image);
      }
      
      // sponsor oluştur
      const sponsorData = {
        name: formData.name,
        description: formData.description || null,
        image_url: imageUrl,
        category: formData.category,
        discount_info: formData.discountInfo,
        address: formData.address || null,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        is_active: formData.isActive
      };
      
      await sponsorService.create(sponsorData);
      
      // başarılı
      setSubmitSuccess(true);
      reset();
      
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
      
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      discountInfo: '',
      address: '',
      latitude: '',
      longitude: '',
      isActive: true
    });
    setImage(null);
    setImagePreview(null);
  };

  return {
    formData,
    imagePreview,
    loading,
    geocoding,
    error,
    submitSuccess,
    handleChange,
    handleImageChange,
    handleGeocode,
    handleSubmit,
    reset
  };
};
