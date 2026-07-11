import type { MenuResponse, Preferences } from './types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(data?.message || 'Layanan Begofood belum dapat dihubungi.');
  }
  return response.json() as Promise<T>;
}

export function getMenus(params: {
  userId: string;
  search?: string;
  category?: string;
  cluster?: string;
  sensory?: string[];
}) {
  const query = new URLSearchParams({ userId: params.userId });
  if (params.search) query.set('search', params.search);
  if (params.category) query.set('category', params.category);
  if (params.cluster) query.set('cluster', params.cluster);
  if (params.sensory?.length) query.set('sensory', params.sensory.join(','));
  return request<MenuResponse>(`/agent/menu?${query}`);
}

export function getPreferences(userId: string) {
  return request<Preferences>(
    `/agent/preferences?userId=${encodeURIComponent(userId)}`,
  );
}

export function savePreferences(
  userId: string,
  preferences: Omit<Preferences, 'hasPreferences'>,
) {
  return request<{ message: string; preferences: Preferences }>(
    '/agent/preferences',
    {
      method: 'POST',
      body: JSON.stringify({ userId, ...preferences }),
    },
  );
}

export function chat(message: string, userId: string, sessionId?: string) {
  return request<{ sessionId: string; response: string }>('/agent/chat', {
    method: 'POST',
    body: JSON.stringify({ message, userId, sessionId }),
  });
}
