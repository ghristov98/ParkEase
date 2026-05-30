import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

const BASE_URL = "https://" + (process.env.EXPO_PUBLIC_DOMAIN ?? "");
setBaseUrl(BASE_URL);
setAuthTokenGetter(() => AsyncStorage.getItem("parkease_access_token"));

interface User {
  id: string; firstName: string; lastName: string; email: string; phone?: string;
  role: string; photoUrl?: string | null; isVerified: boolean; isActive: boolean;
  createdAt: string; updatedAt?: string;
}
interface AuthContextValue {
  user: User | null; accessToken: string | null; isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (u: User) => void;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [token, storedUser] = await Promise.all([
          AsyncStorage.getItem("parkease_access_token"),
          AsyncStorage.getItem("parkease_user"),
        ]);
        if (token && storedUser) {
          setAccessToken(token);
          setUser(JSON.parse(storedUser));
        }
      } finally { setIsLoading(false); }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const resp = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.message || "Login failed");
    }
    const data = await resp.json();
    await Promise.all([
      AsyncStorage.setItem("parkease_access_token", data.accessToken),
      AsyncStorage.setItem("parkease_refresh_token", data.refreshToken),
      AsyncStorage.setItem("parkease_user", JSON.stringify(data.user)),
    ]);
    setAccessToken(data.accessToken);
    setUser(data.user);
  };

  const logout = async () => {
    await Promise.all([
      AsyncStorage.removeItem("parkease_access_token"),
      AsyncStorage.removeItem("parkease_refresh_token"),
      AsyncStorage.removeItem("parkease_user"),
    ]);
    setAccessToken(null);
    setUser(null);
  };

  const updateUser = (u: User) => {
    setUser(u);
    AsyncStorage.setItem("parkease_user", JSON.stringify(u));
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
