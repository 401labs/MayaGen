"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (processed.current) return;
    processed.current = true;

    if (error) {
      toast.error("Google Login failed");
      router.push("/login");
      return;
    }

    if (!code) {
      router.push("/login");
      return;
    }

    const exchangeCode = async () => {
      try {
        const res = await api.post("/auth/google/callback", { code });
        if (res.data.success) {
          toast.success("Successfully logged in!");
          login(res.data.data.access_token);
          // Redirect handled by useAuth or manually here if needed
          // router.push("/dashboard"); 
        }
      } catch (err: any) {
        console.error("Auth callback error:", err);
        const msg = err.response?.data?.error || "Login failed";
        toast.error(msg);
        router.push("/login");
      }
    };

    exchangeCode();
  }, [searchParams, router, login]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 text-white gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      <p className="text-neutral-400 animate-pulse">Authenticating...</p>
    </div>
  );
}
