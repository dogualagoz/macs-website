import { useState, useEffect } from 'react';
import { projectService } from '../services/contentService';
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

export const useProjectForm = (editData = null, onUpdateSuccess = null) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    category: '',
    technologies: '',
    githubUrl: '',
    liveUrl: '',
    teamMembers: '',
    status: 'PLANNING',
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
      
      setFormData({
        title: editData.title || '',
        description: editData.description || '',
        content: editData.content || '',
        category: editData.category_id?.toString() || editData.category?.id?.toString() || '',
        technologies: editData.technologies || '',
        githubUrl: editData.github_url || '',
        liveUrl: editData.live_url || '',
        teamMembers: editData.team_members || '',
        status: editData.status || 'PLANNING',
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
        imageUrl = await projectService.uploadImage(image);
      }
      
      // 2. Proje verisi hazırla
      const projectData = {
        title: formData.title,
        description: formData.description,
        content: formData.content,
        technologies: formData.technologies,
        github_url: formData.githubUrl,
        live_url: formData.liveUrl,
        status: formData.status,
        category_id: formData.category !== '' ? parseInt(formData.category) : null,
        team_members: formData.teamMembers,
        is_featured: formData.isFeatured,
        is_active: formData.isActive
      };
      
      // Sadece yeni resim yüklendiyse image_url ekle
      if (imageUrl) {
        projectData.image_url = imageUrl;
      }
      
      if (isEditMode && editId) {
        // Güncelleme
        await projectService.update(editId, projectData);
        setSubmitSuccess(true);
        
        if (onUpdateSuccess) {
          setTimeout(() => {
            onUpdateSuccess();
          }, 1500);
        }
      } else {
        // Yeni oluşturma
        await projectService.create(projectData);
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
      content: '',
      category: '',
      technologies: '',
      githubUrl: '',
      liveUrl: '',
      teamMembers: '',
      status: 'PLANNING',
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
