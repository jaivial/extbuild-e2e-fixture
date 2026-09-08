export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { Accept: "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (res.status === 401 || res.status === 403) {
    throw new ApiError(res.status, "unauthorized");
  }
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = (j.error || j.detail || msg) as string;
    } catch { /* ignore */ }
    throw new ApiError(res.status, msg);
  }
  const ct = res.headers.get("content-type") ?? "";
  return (ct.includes("application/json") ? await res.json() : (await res.text())) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      headers: body !== undefined ? { "Content-Type": "application/json" } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
};

let _csrf: string | null = null;
/** Fetch (and cache) the CSRF token; /api/account also sets the cookie. */
export async function getCsrf(): Promise<string> {
  if (_csrf) return _csrf;
  const d = await api.get<{ csrf: string }>("/api/account");
  _csrf = d.csrf;
  return _csrf;
}

/** POST form-encoded with the CSRF token, matching the v2 pages' `post()`. */
export async function postForm<T = unknown>(url: string, fields: Record<string, string> = {}): Promise<T> {
  const csrf = await getCsrf();
  const fd = new FormData();
  fd.append("csrf", csrf);
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  const r = await fetch(url, { method: "POST", credentials: "include", body: fd });
  const d = await r.json().catch(() => ({ error: "resposta inválida" }));
  if (!r.ok || (d as { error?: string }).error) throw new Error((d as { error?: string }).error || `HTTP ${r.status}`);
  return d as T;
}

/** JSON request with the CSRF header (matches settings PUT/DELETE in v2). */
export async function sendJson<T = unknown>(url: string, method: string, body?: unknown): Promise<T> {
  const csrf = await getCsrf();
  const r = await fetch(url, {
    method, credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || (d as { error?: string }).error) throw new Error((d as { error?: string }).error || `HTTP ${r.status}`);
  return d as T;
}
