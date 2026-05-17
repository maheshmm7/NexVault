/**
 * NEXVAULT Frontend Environment Configuration
 * Centralized configuration access layer to safely expose and manage environment variables.
 * Decouples code from direct dependency on bundler-specific global objects (import.meta.env).
 */

const getEnvVariable = (key, defaultValue = '') => {
  return import.meta.env[key] || defaultValue;
};

export const ENV = {
  // Application environment properties
  API_URL: getEnvVariable('VITE_API_URL', 'http://localhost:8000/api/v1'),
  
  // Environment status flags
  MODE: getEnvVariable('MODE', 'development'),
  IS_PRODUCTION: import.meta.env.PROD,
  IS_DEVELOPMENT: import.meta.env.DEV,
};

export default ENV;
