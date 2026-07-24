export const API_URL = '/api';

type Menu = {
  id: string;
  name: string;
  description: string | null;
  aiDescription: string | null;
  price: number;
  imageUrl: string | null;
  category: string;
  cluster: string;
  restaurant: string;
  tags: string[];
  allergens: string[];
  ingredients: string[];
  hiddenIngredients: string[];
  sensoryProfile: string[];
  crossContaminationRisk: string | null;
  calories: number | null;
  prepMinutes: number;
  sourceUrl: string | null;
  priceStatus: string | null;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        message?: string;
      } | null;
      throw new Error(data?.message || `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(
        'Server terlalu lama merespons. Menu mungkin sudah tersimpan; tutup form, muat ulang, lalu coba lagi.',
      );
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function getMenus() {
  return request<{ data: Menu[]; total: number }>('/agent/menus');
}

export function getMenu(id: string) {
  return request<Menu>(`/agent/menu/${id}`);
}

export function createMenu(data: {
  name: string;
  description?: string;
  sourceUrl?: string;
  price?: number;
  category?: string;
  cluster?: string;
  restaurant?: string;
  imageUrl?: string;
}) {
  return request<{ menu: Menu; message: string }>('/agent/menu', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateMenu(id: string, data: Partial<Menu>) {
  return request<{ menu: Menu; message: string }>(`/agent/menu/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteMenu(id: string) {
  return request<{ message: string }>(`/agent/menu/${id}`, {
    method: 'DELETE',
  });
}

export type { Menu };
