import { API_BASE_URL, authFetch } from "./client";

const imageCache = new Map();

export async function getProtectedImageUrl(path) {
  if (!path || path.startsWith("blob:") || path.startsWith("data:")) return path;
  if (!imageCache.has(path)) {
    const promise = (async () => {
      const url = new URL(path, API_BASE_URL);
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
  const url = new URL(image.value, API_BASE_URL);
  const response = await authFetch(`${url.pathname}${url.search}`);
  if (!response.ok) throw new Error("existing_image_fetch_failed");
  const blob = await response.blob();
  const filename = image.originalFilename || decodeURIComponent(url.pathname.split("/").pop() || "post-image");
  return new File([blob], filename, { type: blob.type || "application/octet-stream" });
}
