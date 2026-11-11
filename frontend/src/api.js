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
  cache.clear();
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage not available */
  }
}

export function clearToken() {
  cache.clear();
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage not available */
  }
}

// Small in-memory cache so moving between pages feels instant.
// - 'static' answers (categories, skills directory) never change -> kept for the session.
// - 'short' answers (my profile, my skills, matches) are kept 60 s and thrown away
//   after any change (POST / PUT / PATCH / DELETE), so the user never sees old data.
const cache = new Map(); // key -> { data, expires }
const SHORT_TTL = 60 * 1000;

export function clearCache() {
  cache.clear();
}

function clearShortCache() {
  for (const [key, entry] of cache) {
    if (entry.expires !== Infinity) cache.delete(key);
  }
}

async function request(path, { method = 'GET', body, auth = false, cacheFor } = {}) {
  const cacheKey = cacheFor ? `${auth ? getToken() : ''}|${path}` : null;
  if (cacheKey) {
    const hit = cache.get(cacheKey);
    if (hit && hit.expires > Date.now()) return hit.data;
  }
  if (method !== 'GET') clearShortCache();

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

  if (cacheKey) {
    cache.set(cacheKey, {
      data,
      expires: cacheFor === 'static' ? Infinity : Date.now() + SHORT_TTL
    });
  }

  return data;
}

// 1. Authentication
export const register = (data) => request('/auth/register', { method: 'POST', body: data });
export const login = (email, password) =>
  request('/auth/login', { method: 'POST', body: { email, password } });
export const getMe = () => request('/auth/me', { auth: true });

// 2. Profile
// fresh: skip the cache (another student's profile can change because of their answer to my request)
export const getUser = (id, { fresh = false } = {}) =>
  request(`/users/${id}`, { auth: true, cacheFor: fresh ? undefined : 'short' });
export const getMyProfile = () => request('/users/me', { auth: true }); // includes contact + show_contact
export const getContact = (id) => request(`/users/${id}/contact`, { auth: true });
export const updateMe = (data) => request('/users/me', { method: 'PUT', body: data, auth: true });

// 3. Categories
export const getCategories = () => request('/categories', { cacheFor: 'static' });
export const getCategorySkills = (categoryId) =>
  request(`/categories/${categoryId}/skills`, { cacheFor: 'static' });
export const getAllSkills = () => request('/skills', { cacheFor: 'static' }); // whole directory in one call

// 4. Skills
export const getMySkills = () => request('/users/me/skills', { auth: true, cacheFor: 'short' });
export const addMySkill = (skill_id, type, level) =>
  request('/users/me/skills', { method: 'POST', body: { skill_id, type, level }, auth: true });
export const updateMySkill = (id, data) =>
  request(`/users/me/skills/${id}`, { method: 'PUT', body: data, auth: true });
export const deleteMySkill = (id) =>
  request(`/users/me/skills/${id}`, { method: 'DELETE', auth: true });

// 5. Sprint 2: matching, search, request board
export const getMatches = () => request('/matches', { auth: true, cacheFor: 'short' });
export const searchStudents = (subject = '', category = '') => {
  const params = new URLSearchParams();
  if (subject) params.set('subject', subject);
  if (category) params.set('category', category);
  return request(`/search?${params.toString()}`, { auth: true });
};
export const getRequests = () => request('/requests', { auth: true });
export const createRequest = (title, category_id) =>
  request('/requests', { method: 'POST', body: { title, category_id }, auth: true });
export const respondToRequest = (id) =>
  request(`/requests/${id}/responses`, { method: 'POST', auth: true });
export const cancelResponse = (id) =>
  request(`/requests/${id}/responses`, { method: 'DELETE', auth: true });
export const setRequestStatus = (id, status) =>
  request(`/requests/${id}`, { method: 'PATCH', body: { status }, auth: true });

// 6. US-12: contact requests (a hidden contact opens only after the owner accepts)
export const getContactRequests = ({ fresh = false } = {}) =>
  request('/contact-requests', { auth: true, cacheFor: fresh ? undefined : 'short' });
export const sendContactRequest = (to_user_id, message) =>
  request('/contact-requests', { method: 'POST', body: { to_user_id, message }, auth: true });
export const answerContactRequest = (id, status) =>
  request(`/contact-requests/${id}`, { method: 'PATCH', body: { status }, auth: true });
export const cancelContactRequest = (id) =>
  request(`/contact-requests/${id}`, { method: 'DELETE', auth: true });
export const removeContact = (requestId) =>
  request(`/contact-requests/${requestId}`, { method: 'DELETE', auth: true });
export const markContactAnswersSeen = () =>
  request('/contact-requests/seen', { method: 'POST', auth: true });

// Lets the header badge know that the number of waiting requests may have changed.
export const REQUESTS_CHANGED = 'skillswap:contact-requests-changed';
export const announceRequestsChanged = () => window.dispatchEvent(new Event(REQUESTS_CHANGED));
