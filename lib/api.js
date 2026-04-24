// API client for Dropamyn backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dropout-htf0.onrender.com';

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      console.warn('[API] No token in localStorage — request will be unauthenticated');
    }
  }
  return headers;
}

async function apiFetch(path, options = {}) {
  let res;
  try {
    const { headers: extraHeaders, ...rest } = options;
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: { ...getHeaders(), ...extraHeaders },
    });
  } catch (error) {
    throw new Error(`Request failed for ${path}: ${error.message}`);
  }

  if (!res.ok) {
    const err = await res.json().catch(async () => {
      const text = await res.text().catch(() => '');
      return { error: text || `API error ${res.status}` };
    });
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json();
}

// Server-side fetch (no auth token, for SSR)
export async function serverFetch(path) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

// ---- Drops ----
export async function fetchDrops(category) {
  const params = category && category !== 'all' ? `?category=${category}` : '';
  return apiFetch(`/api/drops${params}`);
}

export async function fetchDrop(id) {
  return apiFetch(`/api/drops/${id}`);
}

export async function fetchTrending() {
  return apiFetch('/api/drops/trending');
}

// Toggle upvote on drop (returns { liked, likes, hypeScore })
export async function toggleLike(dropId) {
  return apiFetch(`/api/drops/${dropId}/like`, { method: 'PUT' });
}

// Keep old functions for backward compat
export async function likeDrop(id) {
  return apiFetch(`/api/drops/${id}/like`, { method: 'PUT' });
}

export async function unlikeDrop(id) {
  return apiFetch(`/api/drops/${id}/unlike`, { method: 'PUT' });
}

export async function addComment(dropId, text) {
  return apiFetch(`/api/drops/${dropId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export async function viewDrop(id) {
  return apiFetch(`/api/drops/${id}/view`, { method: 'PUT' });
}

// Enter raffle/waitlist
export async function enterDrop(dropId) {
  return apiFetch(`/api/drops/${dropId}/enter`, { method: 'POST' });
}

// ---- Brands ----
export async function fetchBrands() {
  return apiFetch('/api/brands');
}

export async function fetchBrand(id) {
  return apiFetch(`/api/brands/${id}`);
}

// Toggle follow
export async function toggleFollowBrand(brandId) {
  return apiFetch(`/api/brands/${brandId}/follow`, { method: 'PUT' });
}

// Brand analytics
export async function fetchBrandAnalytics(brandId) {
  return apiFetch(`/api/brands/${brandId}/analytics`);
}

// ---- Auth ----
export async function login(email, password) {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function signup(email, name, password, role = 'user') {
  return apiFetch('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, name, password, role }),
  });
}

export async function fetchMe() {
  return apiFetch('/api/auth/me');
}

// ---- Users ----
export async function toggleSave(userId, dropId) {
  return apiFetch(`/api/users/${userId}/save/${dropId}`, { method: 'PUT' });
}

export async function fetchSavedDrops(userId) {
  return apiFetch(`/api/users/${userId}/saved`);
}

export async function fetchUserProfile(userId) {
  return apiFetch(`/api/users/${userId}`);
}

export async function updateProfile(userId, data) {
  return apiFetch(`/api/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ---- Upload ----
export async function uploadImage(file, options = {}) {
  const formData = new FormData();
  formData.append('image', file);
  if (options.folder) formData.append('folder', options.folder);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
  } catch (error) {
    throw new Error(`Upload request failed: ${error.message}`);
  }

  if (!res.ok) {
    const err = await res.json().catch(async () => {
      const text = await res.text().catch(() => '');
      return { error: text || 'Upload failed' };
    });
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}

// ---- Helpers ----
// Transform backend drop format to match frontend expectations
export function transformDrop(d) {
  return {
    id: d.id,
    title: d.title,
    brand: d.brand || { name: 'Unknown', logo: '' },
    category: d.category,
    description: d.description,
    imageUrl: d.imageUrl,
    dropTime: d.dropTime,
    price: d.price,
    hypeScore: d.hypeScore,
    engagement: {
      likes: d._count?.likes || 0,
      comments: d._count?.comments || 0,
      saves: d._count?.saves || 0,
      views: d.views || 0,
      entries: d._count?.entries || 0,
    },
    featured: d.featured,
    website: d.website,
    accessType: d.accessType || 'open',
    maxQuantity: d.maxQuantity,
    isLiked: d.isLiked || false,
    isSaved: d.isSaved || false,
    isEntered: d.isEntered || false,
    isFollowingBrand: d.isFollowingBrand || false,
  };
}

export function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}
