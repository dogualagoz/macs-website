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
/**
 * Backend'in hata gövdesinden kullanıcıya gösterilecek metni çıkarır.
 *
 * Backend FastAPI uyumlu: { detail: "metin" } ya da 422'de
 * { detail: [{ loc: [...], msg: "..." }] }. Eski kod `data.message`
 * okuduğu için backend'in mesajı hiçbir formda görünmüyordu.
 *
 * @param {unknown} data - error.response.data
 * @returns {string|null}
 */
export const extractApiMessage = (data) => {
  if (!data || typeof data !== 'object') return null;

  const { detail, message } = data;
  if (typeof detail === 'string' && detail.trim()) return detail;

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] || {};
    const field = Array.isArray(first.loc)
      ? first.loc.filter((part) => part !== 'body' && part !== 'query' && part !== 'path').join('.')
      : '';
    const msg = typeof first.msg === 'string' ? first.msg : '';
    if (msg) return field ? `${field}: ${msg}` : msg;
  }

  return typeof message === 'string' && message.trim() ? message : null;
};

export const handleApiError = (error, context = 'işlem') => {
  // Kod içinde fırlatılan doğrulama hataları (Error) olduğu gibi gösterilir.
  if (!error?.isAxiosError && !error?.response && error?.message && error.message !== 'Network Error') {
    return error.message;
  }

  // Network error
  if (!error?.response) {
    return `İnternet bağlantınızı kontrol edin ve tekrar deneyin.`;
  }

  const status = error.response.status;
  const apiMessage = extractApiMessage(error.response.data);

  // Handle specific status codes
  switch (status) {
    case 400:
      return apiMessage || `Geçersiz veri girdiniz. Lütfen kontrol edip tekrar deneyin.`;
    
    case 401:
      return apiMessage || `Oturum süreniz doldu. Lütfen tekrar giriş yapın.`;
    
    case 403:
      return apiMessage || `Bu işlem için yetkiniz bulunmamaktadır.`;
    
    case 404:
      return apiMessage || `İstediğiniz içerik bulunamadı.`;
    
    case 409:
      return apiMessage || `Bu ${context} zaten mevcut.`;
    
    case 413:
      return apiMessage || `Dosya boyutu çok büyük. Lütfen daha küçük bir dosya seçin (max 5MB).`;
    
    case 422:
      return apiMessage || `Girdiğiniz veriler geçerli değil.`;
    
    case 500:
      return `Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.`;
    
    case 503:
      return `Servis şu an kullanılamıyor. Lütfen daha sonra tekrar deneyin.`;
    
    default:
      return apiMessage || `${context} sırasında bir hata oluştu. Lütfen tekrar deneyin.`;
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
  const detail = error.response?.data?.detail;
  if (error.response?.status === 422 && Array.isArray(detail)) {
    return detail.reduce((acc, item) => {
      const field = Array.isArray(item?.loc) ? item.loc[item.loc.length - 1] : null;
      if (field !== null && field !== undefined && typeof item.msg === 'string') acc[field] = item.msg;
      return acc;
    }, {});
  }
  return null;
};
