// src/services/api.js
// Centralised axios client that auto-attaches JWT tokens
// and handles 401 refresh flows.

import axios from 'axios';

const BASE = {
  auth:      'http://localhost:3001',
  incident:  'http://localhost:3002',
  dispatch:  'http://localhost:3003',
  analytics: 'http://localhost:3004',
};

// Create one axios instance per service
const makeClient = (baseURL) => {
  const client = axios.create({ baseURL });

  // Attach token before every request
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  // Handle 401 — token expired
  client.interceptors.response.use(
    (res) => res,
    async (err) => {
      if (err.response?.status === 401) {
        localStorage.clear();
        window.location.href = '/login';
      }
      return Promise.reject(err);
    }
  );

  return client;
};

export const authClient      = makeClient(BASE.auth);
export const incidentClient  = makeClient(BASE.incident);
export const dispatchClient  = makeClient(BASE.dispatch);
export const analyticsClient = makeClient(BASE.analytics);

// ── Auth ──────────────────────────────────────────────────────
export const authAPI = {
  login:        (data) => authClient.post('/auth/login', data),
  refreshToken: (data) => authClient.post('/auth/refresh-token', data),
  getProfile:   ()     => authClient.get('/auth/profile'),
};

// ── Incidents ─────────────────────────────────────────────────
export const incidentAPI = {
  getOpen:      ()           => incidentClient.get('/incidents/open'),
  getById:      (id)         => incidentClient.get(`/incidents/${id}`),
  create:       (data)       => incidentClient.post('/incidents', data),
  updateStatus: (id, status) => incidentClient.put(`/incidents/${id}/status`, { status }),
  assignUnit:   (id, unitId) => incidentClient.put(`/incidents/${id}/assign`, { unitId }),
};

// ── Dispatch ──────────────────────────────────────────────────
export const dispatchAPI = {
  getVehicles:  (serviceType) => dispatchClient.get('/vehicles', { params: serviceType ? { serviceType } : {} }),
  getLocation:  (id)          => dispatchClient.get(`/vehicles/${id}/location`),
  findNearest:  (lat, lng, serviceType) => dispatchClient.get('/vehicles/nearest', { params: { lat, lng, serviceType } }),
  register:     (data)        => dispatchClient.post('/vehicles/register', data),
};

// ── Analytics ─────────────────────────────────────────────────
export const analyticsAPI = {
  getResponseTimes:    (days = 30) => analyticsClient.get(`/analytics/response-times?days=${days}`),
  getIncidentsByRegion:(days = 30) => analyticsClient.get(`/analytics/incidents-by-region?days=${days}`),
  getResourceUtil:     (days = 30) => analyticsClient.get(`/analytics/resource-utilization?days=${days}`),
};

// ── Hospitals (analytics_db hospital capacity) ────────────────
export const hospitalAPI = {
  getAll:       ()     => analyticsClient.get('/hospitals'),
  update:       (id, data) => analyticsClient.put(`/hospitals/${id}`, data),
};
