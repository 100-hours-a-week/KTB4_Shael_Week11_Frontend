export const API_BASE_URL = "http://localhost:8080";

let accessToken = null;
let refreshPromise = null;
const protectedImageUrls = new Map();

export function setAccessToken(token) {
    accessToken = token;
}

export function clearAuthentication() {
    accessToken = null;
    sessionStorage.removeItem("currentUser");
    protectedImageUrls.forEach((imageUrlPromise) => {
        imageUrlPromise
            .then((imageUrl) => URL.revokeObjectURL(imageUrl))
            .catch(() => {});
    });
    protectedImageUrls.clear();
}

async function requestAccessToken() {
    if (!refreshPromise) {
        refreshPromise = fetch(`${API_BASE_URL}/token/refresh`, {
            method: "POST",
            credentials: "include",
        })
            .then(async (response) => {
                let body = null;

                try {
                    body = await response.json();
                } catch (error) {
                }

                if (response.ok) {
                    accessToken = body?.data?.accessToken ?? null;
                } else {
                    accessToken = null;
                }

                return {
                    ok: response.ok && accessToken !== null,
                    status: response.status,
                    body,
                };
            })
            .catch(() => ({
                ok: false,
                status: 500,
                body: {
                    message: "internal_server_error",
                    data: null,
                },
            }))
            .finally(() => {
                refreshPromise = null;
            });
    }

    return refreshPromise;
}

function createRefreshFailureResponse(result) {
    return new Response(JSON.stringify(result.body), {
        status: result.status,
        headers: {
            "Content-Type": "application/json",
        },
    });
}

export async function authFetch(path, options = {}) {
    if (!accessToken) {
        const refreshResult = await requestAccessToken();

        if (!refreshResult.ok) {
            return createRefreshFailureResponse(refreshResult);
        }
    }

    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${accessToken}`);

    let response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
        credentials: "include",
    });

    if (response.status !== 401) {
        return response;
    }

    const refreshResult = await requestAccessToken();

    if (!refreshResult.ok) {
        clearAuthentication();
        return createRefreshFailureResponse(refreshResult);
    }

    headers.set("Authorization", `Bearer ${accessToken}`);

    return fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
        credentials: "include",
    });
}

export async function logout() {
    try {
        await authFetch("/logout", {
            method: "POST",
        });
    } finally {
        clearAuthentication();
    }
}

export async function requireCurrentUser() {
    const savedUser = sessionStorage.getItem("currentUser");

    if (savedUser) {
        try {
            return JSON.parse(savedUser);
        } catch (error) {
            sessionStorage.removeItem("currentUser");
        }
    }

    const refreshResult = await requestAccessToken();

    if (!refreshResult.ok) {
        clearAuthentication();
        location.replace("/login/login.html");
        return new Promise(() => {});
    }

    const response = await authFetch("/user/info");

    if (!response.ok) {
        clearAuthentication();
        location.replace("/login/login.html");
        return new Promise(() => {});
    }

    const body = await response.json();
    const currentUser = body.data;

    sessionStorage.setItem(
        "currentUser",
        JSON.stringify(currentUser)
    );

    return currentUser;
}

export async function getProtectedImageUrl(imagePath) {
    if (!imagePath || imagePath.startsWith("blob:") || imagePath.startsWith("data:")) {
        return imagePath;
    }

    if (!protectedImageUrls.has(imagePath)) {
        protectedImageUrls.set(
            imagePath,
            (async () => {
                const imageUrl = new URL(imagePath, API_BASE_URL);
                const response = await authFetch(
                    `${imageUrl.pathname}${imageUrl.search}`
                );

                if (!response.ok) {
                    throw new Error("protected_image_fetch_failed");
                }

                return URL.createObjectURL(await response.blob());
            })()
        );
    }

    try {
        return await protectedImageUrls.get(imagePath);
    } catch (error) {
        protectedImageUrls.delete(imagePath);
        throw error;
    }
}

export async function setProtectedImage(imageElement, imagePath) {
    if (!imageElement || !imagePath) {
        return;
    }

    try {
        imageElement.src = await getProtectedImageUrl(imagePath);
    } catch (error) {
        imageElement.removeAttribute("src");
    }
}

export function hydrateProtectedImages(root = document) {
    root.querySelectorAll("img[data-protected-src]").forEach((imageElement) => {
        setProtectedImage(imageElement, imageElement.dataset.protectedSrc);
    });
}
