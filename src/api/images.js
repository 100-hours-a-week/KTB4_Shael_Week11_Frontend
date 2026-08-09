import { API_BASE_URL, authFetch } from "./client";

const imageCache = new Map();

function resolveApiUrl(path) {
  const baseUrl = new URL(API_BASE_URL, window.location.origin);
  return new URL(path, baseUrl);
}

export async function getProtectedImageUrl(path) {
  if (!path || path.startsWith("blob:") || path.startsWith("data:")) return path;
  if (!imageCache.has(path)) {
    const promise = (async () => {
      const url = resolveApiUrl(path);
      const response = await authFetch(`${url.pathname}${url.search}`);
      if (!response.ok) throw new Error("protected_image_fetch_failed");
      return URL.createObjectURL(await response.blob());
    })().catch((error) => {
      imageCache.delete(path);
      throw error;
    });
    imageCache.set(path, promise);
  }
  return imageCache.get(path);
}

export function clearProtectedImageCache() {
  imageCache.forEach((promise) => promise.then(URL.revokeObjectURL).catch(() => {}));
  imageCache.clear();
}

export async function protectedPathToFile(image) {
  const url = resolveApiUrl(image.value);
  const response = await authFetch(`${url.pathname}${url.search}`);
  if (!response.ok) throw new Error("existing_image_fetch_failed");
  const blob = await response.blob();
  const filename = decodeURIComponent(url.pathname.split("/").pop() || "post-image");
  return new File([blob], filename, { type: blob.type || "application/octet-stream" });
}
