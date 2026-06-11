'use client';

import axios from 'axios';

/**
 * Aparna: Access token lives in-memory (this module scope), NOT localStorage.
 *
 * Why not localStorage?
 * localStorage is synchronously accessible to any JS running on the page — including
 * injected scripts via XSS. An in-memory variable is completely invisible to attackers
 * unless they have full code execution, at which point the game is already over.
 *
 * The trade-off: the token is lost on page refresh. We recover by calling /auth/refresh
 * on mount using the httpOnly refresh token cookie that the browser sends automatically.
 */
let inMemoryAccessToken = null;

export const setAccessToken = (token) => { inMemoryAccessToken = token; };
export const getAccessToken = () => inMemoryAccessToken;
export const clearAccessToken = () => { inMemoryAccessToken = null; };

// ─── Axios Instance ───────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // Required to send/receive the httpOnly refresh token cookie
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor: Attach access token ─────────────────────────────────

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response Interceptor: Handle 401 with silent refresh ────────────────────

let isRefreshing = false;
let refreshQueue = []; // Requests waiting for token refresh to complete

const processRefreshQueue = (error, token = null) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  refreshQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh on 401 — and only once per request
    if (error.response?.status !== 401 || originalRequest._retried) {
      return Promise.reject(error);
    }

    // Skip refresh attempts for auth endpoints themselves
    if (originalRequest.url?.includes('/auth/')) {
      return Promise.reject(error);
    }

    originalRequest._retried = true;

    if (isRefreshing) {
      // Queue this request until the ongoing refresh resolves
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      }).then((freshToken) => {
        originalRequest.headers.Authorization = `Bearer ${freshToken}`;
        return api(originalRequest);
      });
    }

    isRefreshing = true;

    try {
      const { data } = await api.post('/auth/refresh');
      const freshToken = data.data.accessToken;
      setAccessToken(freshToken);
      processRefreshQueue(null, freshToken);
      originalRequest.headers.Authorization = `Bearer ${freshToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processRefreshQueue(refreshError, null);
      clearAccessToken();
      // Redirect to login on refresh failure — session is truly expired
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ─── API Methods ──────────────────────────────────────────────────────────────

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
};

export const userApi = {
  getMe: () => api.get('/users/me'),
  updateMe: (data) => api.patch('/users/me', data),
  listUsers: (params) => api.get('/users', { params }),
  deleteUser: (id) => api.delete(`/users/${id}`),
};

export const projectApi = {
  create: (data) => api.post('/projects', data),
  list: () => api.get('/projects'),
  getById: (id) => api.get(`/projects/${id}`),
  update: (id, data) => api.patch(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  transitionStatus: (id, status) => api.patch(`/projects/${id}/status`, { status }),
  addMember: (id, data) => api.post(`/projects/${id}/members`, data),
  removeMember: (id, userId) => api.delete(`/projects/${id}/members/${userId}`),
};

export const taskApi = {
  create: (projectId, data) => api.post(`/projects/${projectId}/tasks`, data),
  list: (projectId, params) => api.get(`/projects/${projectId}/tasks`, { params }),
  getById: (projectId, taskId) => api.get(`/projects/${projectId}/tasks/${taskId}`),
  update: (projectId, taskId, data) => api.patch(`/projects/${projectId}/tasks/${taskId}`, data),
  transitionStatus: (projectId, taskId, status) =>
    api.patch(`/projects/${projectId}/tasks/${taskId}/status`, { status }),
  delete: (projectId, taskId) => api.delete(`/projects/${projectId}/tasks/${taskId}`),
};

export default api;
