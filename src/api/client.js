export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
}

async function parseBody(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function requestAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/token/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (response) => {
        const body = await parseBody(response);
        accessToken = response.ok ? body?.data?.accessToken ?? null : null;
        return { ok: response.ok && Boolean(accessToken), status: response.status, body };
      })
      .catch(() => ({ ok: false, status: 500, body: null }))
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

function refreshFailureResponse(result) {
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function authFetch(path, options = {}) {
  if (!accessToken) {
    const refresh = await requestAccessToken();
    if (!refresh.ok) return refreshFailureResponse(refresh);
  }

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  let response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status !== 401) return response;
  const refresh = await requestAccessToken();
  if (!refresh.ok) {
    clearAccessToken();
    return refreshFailureResponse(refresh);
  }
  headers.set("Authorization", `Bearer ${accessToken}`);
  response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, credentials: "include" });
  return response;
}

export async function publicFetch(path, options = {}) {
  return fetch(`${API_BASE_URL}${path}`, { ...options, credentials: "include" });
}

export async function getJson(response) {
  const body = await parseBody(response);
  if (!response.ok) {
    const error = new Error(body?.message || "request_failed");
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}
