"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await api.get("/auth/me"); 
      // API Format: { success: true, message: "...", data: { ... } }
      if (res.data.success) {
          setUser(res.data.data);
      }
    } catch (err: any) {
      // Only log if it's NOT a 401 (Unauthorized) error which is expected on session expiry
      if (err.response?.status !== 401) {
        console.error("Auth Check Failed", err);
      }
      // If 401, we just don't set user, effectively logged out
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = (token: string) => {
    localStorage.setItem("access_token", token);
    fetchUser();
    
    // Check if there's a pending generation request
    const pendingGeneration = localStorage.getItem("pendingGeneration");
    if (pendingGeneration) {
      // Redirect to home page to process the pending generation
      router.push("/");
    } else {
      router.push("/collections");
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    setUser(null);
    toast.info("Logged out successfully");
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
