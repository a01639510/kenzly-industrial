const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const TOKEN_KEY = 'kenzly_token';
const COOKIE_MAX_AGE = 8 * 3600; // 8 hours, same as JWT

export const tokenStore = {
  get: () => (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null),
  set: (t: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, t);
    document.cookie = `${TOKEN_KEY}=${t}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  },
  clear: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
  },
};

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const token = tokenStore.get();
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { credentials: 'include', ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error de red' }));
    throw new Error(err.error || 'Error desconocido');
  }
  return res.json();
}

function json<T>(path: string, method: string, body: unknown): Promise<T> {
  return req<T>(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export const api = {
  auth: {
    verify: () => req<any>('/auth/verify'),
    logout: () => json('/auth/logout', 'POST', {}),
  },

  tenant: {
    get:          (slug: string) => req<any>(`/tenant/${slug}`),
    currentShift: (slug: string) => req<any>(`/tenants/${slug}/current-shift`),
  },

  oee: {
    summary: () => req<any>('/oee/summary'),
    history: (days = 14) => req<any[]>(`/oee/history?days=${days}`),
  },

  orders: {
    list:       (params?: Record<string, string>) =>
      req<any[]>(`/orders${params ? '?' + new URLSearchParams(params) : ''}`),
    summary:    () => req<any>('/orders/summary'),
    compliance: () => req<any>('/orders/compliance'),
    create:     (data: any) => json<any>('/orders', 'POST', data),
    update:     (id: string, data: any) => json<any>(`/orders/${id}`, 'PATCH', data),
    delete:     (id: string) => req<any>(`/orders/${id}`, { method: 'DELETE' }),
  },

  scrap: {
    list:    (limit = 100) => req<any[]>(`/scrap?limit=${limit}`),
    summary: () => req<any>('/scrap/summary'),
    create:  (data: any) => json<any>('/scrap', 'POST', data),
  },

  downtime: {
    active:  () => req<any>('/downtime/active').catch(() => null),
    causes:  () => req<any[]>('/downtime/causes'),
    history: (params?: Record<string, string>) =>
      req<any[]>(`/downtime/history${params ? '?' + new URLSearchParams(params) : ''}`),
    summary: () => req<any>('/downtime/summary'),
    start:   (data: any) => json<any>('/downtime/start', 'POST', data),
    end:     (id: string, data: any) => json<any>(`/downtime/${id}/end`, 'POST', data),
  },

  maintenance: {
    plans:    (status?: string) =>
      req<any[]>(`/maintenance/plans${status ? `?status=${status}` : ''}`),
    history:  (limit = 30) => req<any[]>(`/maintenance/history?limit=${limit}`),
    summary:  () => req<any>('/maintenance/summary'),
    upcoming: (days = 7) => req<any[]>(`/maintenance/upcoming?days=${days}`),
    create:   (data: any) => json<any>('/maintenance/plans', 'POST', data),
    update:   (id: number, data: any) => json<any>(`/maintenance/plans/${id}`, 'PATCH', data),
    complete: (id: number, data: any) =>
      json<any>(`/maintenance/plans/${id}/complete`, 'POST', data),
    delete:   (id: number) => req<any>(`/maintenance/plans/${id}`, { method: 'DELETE' }),
  },

  telemetry: {
    latest:  (assetId: string, key: string) =>
      req<any>(`/telemetry/latest/${assetId}/${key}`),
    history: (assetId: string, key: string, hours = 48, subKey?: string) =>
      req<any[]>(`/telemetry/history/${assetId}/${key}?hours=${hours}${subKey ? `&subKey=${subKey}` : ''}`),
  },
};
