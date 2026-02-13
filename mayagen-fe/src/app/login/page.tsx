"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Lock } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const res = await api.get("/auth/google/login");
      if (res.data.success) {
        window.location.href = res.data.data.url;
      }
    } catch (error) {
      console.error("Failed to initialize Google Login", error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white selection:bg-cyan-500/30 p-4 lg:p-8">
      <div className="w-full max-w-[1400px] grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

        {/* Left Panel - Branding Card */}
        <div className="hidden lg:flex flex-col justify-between relative bg-neutral-900 h-[800px] w-full rounded-[2.5rem] overflow-hidden p-12 ring-1 ring-white/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(76,29,149,0.4),_rgba(0,0,0,0)_70%)] opacity-70 pointer-events-none"></div>
          {/* Gradient Overlay for the rich purple/blue look */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 via-blue-900/20 to-black z-0"></div>

          {/* Abstract blurred shapes for the glow effect */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/30 rounded-full blur-3xl z-0 mix-blend-screen animate-pulse duration-[4s]"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl z-0 mix-blend-screen"></div>

          <div className="relative z-10 flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-white" />
            <span className="text-xl font-semibold tracking-wide">MAYAGEN</span>
          </div>

          <div className="relative z-10 space-y-4 max-w-lg mb-20">
            <h1 className="text-6xl font-bold tracking-tight leading-tight">
              Your Vision.<br />
              Your Studio.<br />
              <span className="text-neutral-400">Your Reality.</span>
            </h1>
            <p className="text-neutral-400 text-lg max-w-sm">
              Unleash your creativity with MayaGen. Transform text into stunning visual masterpieces and build high-quality synthetic datasets in seconds.
            </p>
          </div>
          {/* Grid overlay pattern */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)] pointer-events-none z-0"></div>
        </div>

        {/* Right Panel - Form */}
        <div className="w-full flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-8">
            <div className="space-y-2 text-center lg:text-left">
              <h2 className="text-3xl font-medium tracking-tight">Welcome back</h2>
              <p className="text-neutral-500">Sign in to access your studio</p>
            </div>

            <div className="space-y-4">
              <Button
                onClick={handleGoogleLogin}
                className="w-full h-14 bg-white hover:bg-neutral-200 text-black rounded-xl text-base font-medium transition-all flex items-center justify-center gap-3"
                disabled={loading}
              >
                  {loading ? (
                      <Loader2 className="animate-spin h-5 w-5" />
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      Sign within Google
                    </>
                  )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
