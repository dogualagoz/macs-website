import apiClient from './apiClient';

const uploadService = {
  /**
   * Merkezi dosya yükleme fonksiyonu
   * @param {File} file - Yüklenecek dosya
   * @returns {Promise<string>} - Yüklenen dosyanın URL'i
   */
  uploadImage: async (file) => {
    if (!file) return null;
    
    const formData = new FormData();
    formData.append('file', file);
    
    // Backend'de prefix'i /api/upload olarak değiştirdik çakışmayı önlemek için
    const response = await apiClient.post('/api/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.url;
  }
};

export default uploadService;
