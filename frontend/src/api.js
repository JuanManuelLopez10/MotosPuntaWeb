const FALLBACK_API_URL = "https://motospuntaweb.onrender.com";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || FALLBACK_API_URL
).replace(/\/+$/, "");

export const buildApiUrl = (path) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
