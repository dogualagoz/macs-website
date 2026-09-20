import { useState, useEffect } from 'react';
import sponsorService from '../../../shared/services/api/sponsorService';
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

export const useSponsorForm = (editData = null, onUpdateSuccess = null) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    discountInfo: '',
    address: '',
    latitude: '',
    longitude: '',
    isActive: true,
    isFeatured: false
  });
  
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  // Edit data geldiğinde formu doldur
  useEffect(() => {
    if (editData) {
      setIsEditMode(true);
      setEditId(editData.id);
      
      setFormData({
        name: editData.name || '',
        description: editData.description || '',
        category: editData.category || '',
        discountInfo: editData.discount_info || '',
        address: editData.address || '',
        latitude: editData.latitude?.toString() || '',
        longitude: editData.longitude?.toString() || '',
        isActive: editData.is_active ?? true,
        isFeatured: editData.is_featured ?? false
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
      if (!formData.name || !formData.category) {
        throw new Error('Lütfen zorunlu alanları doldurun');
      }

      // Koordinat opsiyonel: kurumsal sponsorlarin fiziksel adresi olmayabilir,
      // bunlar haritada gosterilmez. Ama yarim koordinat gecersiz.
      const hasLat = formData.latitude !== '' && formData.latitude !== null;
      const hasLng = formData.longitude !== '' && formData.longitude !== null;
      if (hasLat !== hasLng) {
        throw new Error('Enlem ve boylamın ikisini birden girin ya da ikisini de boş bırakın.');
      }

      // görsel yükle (yeni resim seçildiyse)
      let imageUrl = null;
      if (image) {
        imageUrl = await sponsorService.uploadImage(image);
      }
      
      // sponsor verisi hazırla
      const sponsorData = {
        name: formData.name,
        description: formData.description || null,
        category: formData.category,
        discount_info: formData.discountInfo ? formData.discountInfo : null,
        address: formData.address || null,
        latitude: hasLat ? parseFloat(formData.latitude) : null,
        longitude: hasLng ? parseFloat(formData.longitude) : null,
        is_active: formData.isActive,
        is_featured: formData.isFeatured
      };
      
      // Sadece yeni resim yüklendiyse image_url ekle
      if (imageUrl) {
        sponsorData.image_url = imageUrl;
      }
      
      if (isEditMode && editId) {
        // Güncelleme
        await sponsorService.update(editId, sponsorData);
        setSubmitSuccess(true);
        
        if (onUpdateSuccess) {
          setTimeout(() => {
            onUpdateSuccess();
          }, 1500);
        }
      } else {
        // Yeni oluşturma
        await sponsorService.create(sponsorData);
        setSubmitSuccess(true);
        reset();
      }
      
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
      isActive: true,
      isFeatured: false
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
    isEditMode,
    handleChange,
    handleImageChange,
    handleGeocode,
    handleSubmit,
    reset
  };
};
