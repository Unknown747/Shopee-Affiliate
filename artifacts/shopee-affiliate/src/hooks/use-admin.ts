import { useState, useEffect } from "react";
import { useLocation } from "wouter";

const TOKEN_KEY = "shopee_admin_token";

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function useAdmin() {
  const [token, setTokenState] = useState<string | null>(getAdminToken());
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleStorage = () => {
      setTokenState(getAdminToken());
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const login = (newToken: string) => {
    setAdminToken(newToken);
    setTokenState(newToken);
    window.dispatchEvent(new Event("storage"));
  };

  const logout = () => {
    clearAdminToken();
    setTokenState(null);
    window.dispatchEvent(new Event("storage"));
    setLocation("/admin");
  };

  return {
    token,
    isAuthenticated: !!token,
    login,
    logout,
  };
}
