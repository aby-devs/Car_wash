// In dev, call the backend URL from .env. In production, use same-origin relative URLs
// so auth cookies are always sent (frontend is served from backend/dist).
export const API_BASE_URL = import.meta.env.DEV
  ? (import.meta.env.VITE_API_URL || 'http://localhost:5000')
  : '';

export const SOCKET_URL = API_BASE_URL || window.location.origin;
