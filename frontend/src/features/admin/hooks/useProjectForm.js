import { useState } from 'react';
import { projectService } from '../services/contentService';
import { handleApiError } from '../../../shared/utils/errorHandler';

export const useProjectForm = () => {
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
        imageUrl = await projectService.uploadImage(image);
      }
      
      // 2. Proje oluştur
      const projectData = {
        title: formData.title,
        description: formData.description,
        content: formData.content,
        image_url: imageUrl,
        technologies: formData.technologies,
        github_url: formData.githubUrl,
        live_url: formData.liveUrl,
        status: formData.status,
        category_id: formData.category !== '' ? parseInt(formData.category) : null,
        team_members: formData.teamMembers,
        is_featured: formData.isFeatured,
        is_active: formData.isActive
      };
      
      await projectService.create(projectData);
      
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
    handleChange,
    handleImageChange,
    handleSubmit
  };
};
