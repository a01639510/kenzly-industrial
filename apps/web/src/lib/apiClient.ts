const env  = (import.meta as unknown as { env: Record<string, string> }).env
const BASE = env.VITE_API_URL || 'http://localhost:3001'

let _token: string | null = null

export function setApiToken(token: string | null) {
  _token = token
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  }
  if (_token) headers['Authorization'] = `Bearer ${_token}`

  const res = await fetch(`${BASE}${path}`, { ...init, headers })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${body}`)
  }
  return res.json() as Promise<T>
}

export async function bridgeApiLogin(): Promise<string | null> {
  const slug     = env.VITE_API_TENANT_SLUG
  const username = env.VITE_API_USERNAME
  const password = env.VITE_API_PASSWORD

  if (!slug || !username || !password) {
    console.warn('[api] VITE_API_TENANT_SLUG / VITE_API_USERNAME / VITE_API_PASSWORD no configurados')
    return null
  }

  try {
    const data = await apiFetch<{ token: string }>('/auth/user-login', {
      method: 'POST',
      body: JSON.stringify({ slug, username, password }),
    })
    return data.token
  } catch (err) {
    console.error('[api] bridge login failed:', err)
    return null
  }
}
