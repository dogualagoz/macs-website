const env = {
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  productionUrl: process.env.REACT_APP_API_URL,
  mapboxToken: process.env.REACT_APP_MAPBOX_TOKEN,
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  enableAnalytics: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
  enableDebug: process.env.REACT_APP_ENABLE_DEBUG === 'true',
};

if (!env.apiUrl) {
  console.error('REACT_APP_API_URL tanimli degil');
}

if (!env.mapboxToken) {
  console.warn('REACT_APP_MAPBOX_TOKEN tanimli degil. Harita ozellikleri calismayabilir.');
}

if (env.isDevelopment) {
  console.log('Mapbox Token:', env.mapboxToken ? 'yuklendi' : 'yok');
}

export default env;
