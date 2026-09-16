import { auth } from './firebase';

const apiUrl = import.meta.env.VITE_API_URL ?? '/api';

export async function apiFetch<T>(path: string): Promise<T> {
  if (!auth?.currentUser) {
    throw new Error('Não autenticado');
  }
  const token = await auth.currentUser.getIdToken();
  const response = await fetch(`${apiUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(body?.message ?? `Erro ${response.status}`);
  }
  return (await response.json()) as T;
}

export type MeResponse = {
  uid: string;
  email: string | null;
  displayName: string | null;
  createdAt: string;
  updatedAt: string;
};
