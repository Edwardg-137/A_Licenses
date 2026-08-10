'use client';

import { useAuthStore } from './auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Cliente API con Bearer token y refresh automático (una sola reintentada
 * por petición cuando el access token expira).
 */
export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
  retryOnUnauthorized = true,
): Promise<T> {
  const { accessToken } = useAuthStore.getState();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401 && retryOnUnauthorized) {
    const refreshed = await tryRefresh();
    if (refreshed) return api<T>(path, options, false);
    useAuthStore.getState().clearSession();
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : (body?.message ?? `Error ${response.status}`);
    throw new ApiError(response.status, message);
  }
  return body as T;
}

async function tryRefresh(): Promise<boolean> {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) return false;

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) return false;

  const session = await response.json();
  useAuthStore.getState().setSession(session);
  return true;
}

/** Sube un archivo con multipart/form-data (sin Content-Type manual). */
export async function apiUpload<T = unknown>(
  path: string,
  formData: FormData,
): Promise<T> {
  const { accessToken } = useAuthStore.getState();
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    body: formData,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : (body?.message ?? `Error ${response.status}`);
    throw new ApiError(response.status, message);
  }
  return body as T;
}

/** Descarga un documento autenticado como Blob (para preview o descarga). */
export async function apiDownloadBlob(documentId: string): Promise<Blob> {
  const { accessToken } = useAuthStore.getState();
  const response = await fetch(`${API_URL}/documents/${documentId}/download`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  if (!response.ok) throw new ApiError(response.status, 'No se pudo descargar el documento');
  return response.blob();
}

/** Abre un documento en pestaña nueva (PDF/JPG se muestran inline; DWG se descarga). */
export async function openDocumentPreview(documentId: string): Promise<void> {
  const blob = await apiDownloadBlob(documentId);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Descarga el PDF oficial de la licencia de un expediente. */
export async function downloadLicensePdf(applicationId: string, fileName?: string): Promise<void> {
  const { accessToken } = useAuthStore.getState();
  const response = await fetch(`${API_URL}/applications/${applicationId}/license/download`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  if (!response.ok) throw new ApiError(response.status, 'No se pudo descargar la licencia');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName ?? 'licencia.pdf';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export { API_URL };
