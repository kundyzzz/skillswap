// All requests to Kundyz's backend go through this file.
// Endpoints follow docs/api.md (base URL /api, JSON, snake_case).

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const TOKEN_KEY = 'skillswap_token';

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage not available */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage not available */
  }
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Is the backend running?');
  }

  if (response.status === 204) return null;

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const code = data?.error?.code || 'UNKNOWN_ERROR';
    const message = data?.error?.message || 'Something went wrong';
    throw new ApiError(response.status, code, message);
  }

  return data;
}

// 1. Authentication
export const register = (data) => request('/auth/register', { method: 'POST', body: data });
export const login = (email, password) =>
  request('/auth/login', { method: 'POST', body: { email, password } });
export const getMe = () => request('/auth/me', { auth: true });

// 2. Profile
export const getUser = (id) => request(`/users/${id}`, { auth: true });
export const updateMe = (data) => request('/users/me', { method: 'PUT', body: data, auth: true });

// 3. Categories
export const getCategories = () => request('/categories');
export const getCategorySkills = (categoryId) => request(`/categories/${categoryId}/skills`);

// 4. Skills
export const getMySkills = () => request('/users/me/skills', { auth: true });
export const addMySkill = (skill_id, type, level) =>
  request('/users/me/skills', { method: 'POST', body: { skill_id, type, level }, auth: true });
export const updateMySkill = (id, data) =>
  request(`/users/me/skills/${id}`, { method: 'PUT', body: data, auth: true });
export const deleteMySkill = (id) =>
  request(`/users/me/skills/${id}`, { method: 'DELETE', auth: true });
