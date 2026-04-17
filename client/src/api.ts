const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const buildUrl = (endpoint: string) => {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }

  const normalizedPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return apiBaseUrl ? `${apiBaseUrl}${normalizedPath}` : normalizedPath;
};

export const apiFetch = (endpoint: string, options?: RequestInit) => {
  return fetch(buildUrl(endpoint), options);
};
