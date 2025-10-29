// Environment configuration for the Recipe Matcher frontend
// This file handles different environments (dev, staging, prod)

export interface AppConfig {
  apiBaseUrl: string;
  websocketUrl: string;
  environment: 'development' | 'staging' | 'production';
  enableDebugLogs: boolean;
}

// Get environment from Vite's import.meta.env
const getEnvironment = (): 'development' | 'staging' | 'production' => {
  const env = import.meta.env.VITE_ENV || import.meta.env.MODE;
  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  return 'development';
};

// Get configuration from environment variables (set by build process)
export const getConfig = (): AppConfig => {
  const environment = getEnvironment();
  
  // Use environment variables if available (from .env files)
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://wrkkwv7lrb.execute-api.eu-west-1.amazonaws.com/prod';
  const websocketUrl = import.meta.env.VITE_WEBSOCKET_URL || import.meta.env.VITE_WS_URL || 'wss://pog1yqg5cc.execute-api.eu-west-1.amazonaws.com/prod';
  
  return {
    apiBaseUrl,
    websocketUrl,
    environment,
    enableDebugLogs: environment !== 'production',
  };
};

// Export the current configuration
export const config = getConfig();

// Helper functions
export const isDevelopment = () => config.environment === 'development';
export const isProduction = () => config.environment === 'production';
export const isStaging = () => config.environment === 'staging';

// Debug logging helper
export const debugLog = (...args: any[]) => {
  if (config.enableDebugLogs) {
    console.log('[Recipe Matcher]', ...args);
  }
};
