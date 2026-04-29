/**
 * API client for communicating with the backend.
 * Handles auth tokens, error responses, and base URL configuration.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const API_PREFIX = '/api/v1';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { message: string; details?: unknown };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

function buildUrl(endpoint: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(`${API_BASE}${API_PREFIX}${endpoint}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function request<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, params, headers = {}, skipAuth = false } = options;

  const url = buildUrl(endpoint, params);

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (!skipAuth) {
    const token = getAuthToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data: ApiResponse<T> = await response.json();

    // Handle token expiry — attempt refresh
    if (response.status === 401 && !skipAuth) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        // Retry the original request
        return request<T>(endpoint, options);
      }
      // Redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    return data;
  } catch (error) {
    console.error('API request failed:', error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Network error',
      },
    };
  }
}

async function attemptTokenRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;

  try {
    const response = await fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();

    if (data.success && data.data) {
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      return true;
    }
  } catch {
    console.error('Token refresh failed');
  }

  return false;
}

// ── Exported API methods ─────────────────────────────────────────────

export const api = {
  get: <T = unknown>(endpoint: string, params?: Record<string, string | number | undefined>) =>
    request<T>(endpoint, { params }),

  post: <T = unknown>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'POST', body }),

  put: <T = unknown>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'PUT', body }),

  delete: <T = unknown>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),

  // Auth-specific (skip auth header)
  auth: {
    login: (email: string, password: string) =>
      request('/auth/login', { method: 'POST', body: { email, password }, skipAuth: true }),

    register: (email: string, password: string, name: string) =>
      request('/auth/register', {
        method: 'POST',
        body: { email, password, name },
        skipAuth: true,
      }),

    magicLink: (email: string) =>
      request('/auth/magic-link', { method: 'POST', body: { email }, skipAuth: true }),

    verifyMagicLink: (token: string) =>
      request('/auth/verify-magic-link', { method: 'POST', body: { token }, skipAuth: true }),

    me: () => request('/auth/me'),

    logout: () => {
      const refreshToken = localStorage.getItem('refreshToken');
      return request('/auth/logout', { method: 'POST', body: { refreshToken } });
    },
  },

  // Config
  config: () => request('/config', { skipAuth: true }),

  // Export
  exportToGithub: (repoName: string, repoDescription?: string, isPrivate?: boolean) =>
    request('/export/github', {
      method: 'POST',
      body: { repoName, repoDescription, isPrivate },
    }),
};

export type { ApiResponse };
