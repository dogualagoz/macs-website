import { useState, useEffect } from 'react';
import { memberService } from '../../../shared/services/api';
import { handleApiError } from '../../../shared/utils/errorHandler';
import { getMediaUrl } from '../../../shared/utils/media';

const EMPTY_FORM = {
  fullName: '',
  profileImage: '',
  isActive: true
};

/**
 * Üye ekleme/güncelleme formu.
 *
 * Görsel, diğer formlardaki gibi yalnızca kayıt sırasında yüklenir. Eskiden
 * dosya seçildiği anda yükleniyordu; form iptal edilince ya da başka dosya
 * seçilince sunucuda sahipsiz dosyalar kalıyordu.
 */
export const useMemberForm = (editData = null, onSuccess = null) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const isEditMode = !!editData;

  useEffect(() => {
    setImage(null);
    setError(null);

    if (editData) {
      setFormData({
        fullName: editData.full_name || '',
        profileImage: editData.profile_image || '',
        isActive: editData.is_active !== undefined ? editData.is_active : true
      });
      setImagePreview(editData.profile_image ? getMediaUrl(editData.profile_image, editData.full_name) : null);
    } else {
      setFormData(EMPTY_FORM);
      setImagePreview(null);
    }
  }, [editData]);

  const handleChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (file) => {
    if (!file) return;
    setImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSubmitSuccess(false);

    try {
      let profileImage = formData.profileImage || null;
      if (image) {
        profileImage = await memberService.uploadImage(image);
      }

      const payload = {
        full_name: formData.fullName,
        profile_image: profileImage,
        is_active: formData.isActive
      };

      if (isEditMode) {
        await memberService.update(editData.id, payload);
      } else {
        await memberService.create(payload);
      }

      setSubmitSuccess(true);
      setImage(null);
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }

      if (!isEditMode) {
        setFormData(EMPTY_FORM);
        setImagePreview(null);
      } else {
        setFormData(prev => ({ ...prev, profileImage: profileImage || '' }));
      }
    } catch (err) {
      setError(handleApiError(err, 'üye'));
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
