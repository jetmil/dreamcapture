import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.95:8200';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests (read from zustand persist storage)
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      console.log('🔍 Interceptor - authStorage:', authStorage ? 'exists' : 'null');

      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        const token = parsed.state?.token;

        console.log('🔍 Interceptor - parsed token:', token ? token.substring(0, 20) + '...' : 'null');

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('✅ Interceptor - Authorization header set');
        } else {
          console.warn('⚠️ Interceptor - No token in auth-storage');
        }
      } else {
        console.warn('⚠️ Interceptor - No auth-storage in localStorage');
      }
    } catch (e) {
      console.error('❌ Error reading auth token:', e);
    }
  }
  return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized errors
      if (typeof window !== 'undefined') {
        const authStorage = localStorage.getItem('auth-storage');
        const url = error.config?.url || '';

        // Public endpoints that don't require authentication
        const publicEndpoints = ['/auth/login', '/auth/register', '/dreams', '/moments'];
        const isPublicEndpoint = publicEndpoints.some(endpoint => url.includes(endpoint));

        if (authStorage && !isPublicEndpoint) {
          // User was logged in but token expired on protected endpoint
          console.error('Token invalid, clearing auth state');
          localStorage.removeItem('auth-storage');
          // Could trigger a re-login modal or redirect here
        }
      }
    } else if (error.response) {
      // Log other errors for debugging
      console.error('API Error Response:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
      });
    } else if (error.request) {
      console.error('API No Response:', error.message);
    } else {
      console.error('API Request Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Types
export interface User {
  id: string;
  username: string;
  email: string;
  is_active: boolean;
  is_premium: boolean;
  created_at: string;
}

export interface Dream {
  id: string;
  user_id: string;
  title?: string;
  description: string;
  audio_url?: string;
  ai_analysis?: {
    themes: string[];
    emotions: string[];
    symbols: string[];
    narrative: string;
    tags: string[];
    visual_prompt: string;
  };
  ai_tags?: string[];
  generated_image_url?: string;
  created_at: string;
  expires_at: string;
  is_public: boolean;
  is_visible: boolean;
  ttl_days: number;
  view_count: number;
}

export interface Moment {
  id: string;
  user_id: string;
  caption?: string;
  media_type: 'photo' | 'video';
  media_url: string;
  location?: {
    lat: number;
    lon: number;
    name?: string;
  };
  ai_tags?: string[];
  created_at: string;
  expires_at: string;
  view_count: number;
}

// Auth API
export const authAPI = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post<User>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<{ access_token: string; token_type: string }>('/auth/login', data),

  me: () => api.get<User>('/auth/me'),
};

// Dreams API
export const dreamsAPI = {
  create: (data: { description: string; title?: string; is_public?: boolean }) =>
    api.post<Dream>('/dreams', data),

  getAll: (skip = 0, limit = 20) =>
    api.get<Dream[]>('/dreams', { params: { skip, limit } }),

  getMy: (skip = 0, limit = 20) =>
    api.get<Dream[]>('/dreams/my', { params: { skip, limit } }),

  getById: (id: string) => api.get<Dream>(`/dreams/${id}`),

  delete: (id: string) => api.delete(`/dreams/${id}`),
};

// Moments API
export const momentsAPI = {
  create: (data: {
    caption?: string;
    media_type: 'photo' | 'video';
    media_url: string;
    location?: { lat: number; lon: number; name?: string };
  }) => api.post<Moment>('/moments', data),

  getAll: (skip = 0, limit = 20) =>
    api.get<Moment[]>('/moments', { params: { skip, limit } }),

  getById: (id: string) => api.get<Moment>(`/moments/${id}`),
};

// WebSocket connection
export const connectWebSocket = (onMessage: (data: any) => void): WebSocket => {
  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://192.168.0.95:8200/ws/stream';
  const ws = new WebSocket(WS_URL);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  return ws;
};
