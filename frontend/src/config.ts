export const APP_CONFIG = {
  MODE: (import.meta.env.VITE_APP_MODE as 'PORTAL' | 'STANDALONE') || 'STANDALONE',
  API_URL: import.meta.env.VITE_API_URL || '',
  IS_PORTAL: import.meta.env.VITE_APP_MODE === 'PORTAL',
};
