/**
 * Environment configuration
 * Centralized access to environment variables
 */

const env = {
  // API Configuration
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:5001/api',
  
  // Environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Feature Flags
  enableAnalytics: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
  enableDebug: process.env.REACT_APP_ENABLE_DEBUG === 'true',
};

// Validation
if (!env.apiUrl) {
  console.error('REACT_APP_API_URL is not defined in environment variables');
}

export default env;
