const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Token ${token}`);
  }

  const targetUrl = `${API_URL}${endpoint}`;
  let response: Response;
  try {
    response = await fetch(targetUrl, {
      ...options,
      headers,
    });
  } catch (networkError: unknown) {
    console.error(`[API Network Error] Impossible de joindre ${targetUrl}:`, networkError);
    throw new Error(
      `Impossible de joindre le serveur backend (${API_URL}). Vérifiez que Django est démarré sur le port 8000.`
    );
  }

  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.non_field_errors?.[0] || 'Une erreur est survenue.');
  }

  return response.json();
}

export async function uploadAudioAPI(endpoint: string, formData: FormData) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }

  const targetUrl = `${API_URL}${endpoint}`;
  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: formData,
    });
  } catch (networkError: unknown) {
    console.error(`[API Network Error] Impossible de joindre ${targetUrl}:`, networkError);
    throw new Error(
      `Impossible de joindre le serveur backend (${API_URL}). Vérifiez que Django est démarré sur le port 8000.`
    );
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg =
      errorData.detail ||
      errorData.error ||
      errorData.message ||
      errorData.non_field_errors?.[0] ||
      `Erreur serveur HTTP ${response.status} (${response.statusText || 'Échec de transcription'})`;
    throw new Error(errorMsg);
  }

  return response.json();
}
