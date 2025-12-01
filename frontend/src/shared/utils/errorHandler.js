/**
 * Error Handler Utility
 * Centralized error handling for API calls
 */

/**
 * Handle API errors and return user-friendly messages
 * @param {Error} error - The error object from API call
 * @param {string} context - Context of the error (e.g., 'event creation', 'file upload')
 * @returns {string} User-friendly error message
 */
export const handleApiError = (error, context = 'işlem') => {
  // Network error
  if (!error.response) {
    return `İnternet bağlantınızı kontrol edin ve tekrar deneyin.`;
  }

  const status = error.response.status;
  const data = error.response.data;

  // Handle specific status codes
  switch (status) {
    case 400:
      return data?.message || `Geçersiz veri girdiniz. Lütfen kontrol edip tekrar deneyin.`;
    
    case 401:
      return `Oturum süreniz doldu. Lütfen tekrar giriş yapın.`;
    
    case 403:
      return `Bu işlem için yetkiniz bulunmamaktadır.`;
    
    case 404:
      return `İstediğiniz içerik bulunamadı.`;
    
    case 409:
      return data?.message || `Bu ${context} zaten mevcut.`;
    
    case 413:
      return `Dosya boyutu çok büyük. Lütfen daha küçük bir dosya seçin (max 5MB).`;
    
    case 422:
      return data?.message || `Girdiğiniz veriler geçerli değil.`;
    
    case 500:
      return `Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.`;
    
    case 503:
      return `Servis şu an kullanılamıyor. Lütfen daha sonra tekrar deneyin.`;
    
    default:
      return data?.message || `${context} sırasında bir hata oluştu. Lütfen tekrar deneyin.`;
  }
};

/**
 * Log error to console (development only)
 * @param {Error} error - The error object
 * @param {string} context - Context of the error
 */
export const logError = (error, context) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}] Error:`, error);
    console.error('Response:', error.response?.data);
  }
};

/**
 * Check if error is a network error
 * @param {Error} error - The error object
 * @returns {boolean}
 */
export const isNetworkError = (error) => {
  return !error.response && error.message === 'Network Error';
};

/**
 * Check if error is an authorization error
 * @param {Error} error - The error object
 * @returns {boolean}
 */
export const isAuthError = (error) => {
  return error.response?.status === 401 || error.response?.status === 403;
};

/**
 * Extract validation errors from response
 * @param {Error} error - The error object
 * @returns {Object} Validation errors by field
 */
export const getValidationErrors = (error) => {
  if (error.response?.status === 422 && error.response?.data?.errors) {
    return error.response.data.errors;
  }
  return null;
};
