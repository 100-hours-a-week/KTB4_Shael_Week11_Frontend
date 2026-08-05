import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authFetch, clearAccessToken, publicFetch, requestAccessToken, setAccessToken } from "../api/client";
import { clearProtectedImageCache } from "../api/images";

const AuthContext = createContext(null);

function readSavedUser() {
  try { return JSON.parse(sessionStorage.getItem("currentUser")); } catch { return null; }
}

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(readSavedUser);
  const [loading, setLoading] = useState(true);

  const setUser = useCallback((nextUser) => {
    setUserState(nextUser);
    if (nextUser) sessionStorage.setItem("currentUser", JSON.stringify(nextUser));
    else sessionStorage.removeItem("currentUser");
  }, []);

  const clearAuth = useCallback(() => {
    clearAccessToken();
    clearProtectedImageCache();
    setUser(null);
  }, [setUser]);

  useEffect(() => {
    let active = true;
    (async () => {
      const refresh = await requestAccessToken();
      if (!active) return;
      if (!refresh.ok) {
        clearAuth();
        setLoading(false);
        return;
      }
      const response = await authFetch("/user/info");
      if (!active) return;
      if (response.ok) {
        const body = await response.json();
        setUser(body.data);
      } else clearAuth();
      setLoading(false);
    })();
    return () => { active = false; };
  }, [clearAuth, setUser]);

  const login = useCallback(async (email, password) => {
    const response = await publicFetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const body = await response.json().catch(() => null);
    if (response.ok) {
      setAccessToken(body.data.token.accessToken);
      setUser({ userId: body.data.userId, email: body.data.email, nickname: body.data.nickname, profileImage: body.data.profileImage });
    }
    return { response, body };
  }, [setUser]);

  const logout = useCallback(async () => {
    try { await authFetch("/logout", { method: "POST" }); } finally { clearAuth(); }
  }, [clearAuth]);

  const value = useMemo(() => ({ user, loading, login, logout, setUser, clearAuth }), [user, loading, login, logout, setUser, clearAuth]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
