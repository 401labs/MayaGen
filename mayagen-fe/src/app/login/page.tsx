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
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Must use FormData for OAuth2PasswordRequestForm
      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);

      const res = await api.post("/auth/token", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      login(res.data.data.access_token);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.detail || "Login failed");
    } finally {
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
              <p className="text-neutral-500">Enter your credentials to access your studio</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="GenMaster"
                  className="bg-neutral-900 border-none h-12 rounded-lg text-neutral-300 placeholder:text-neutral-600 focus-visible:ring-1 focus-visible:ring-violet-500"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  className="bg-neutral-900 border-none h-12 rounded-lg text-neutral-300 placeholder:text-neutral-600 focus-visible:ring-1 focus-visible:ring-violet-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••"
                  required
                />
              </div>

              {error && (
                <div className="text-red-400 text-sm text-center bg-red-900/10 p-2 rounded">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-base font-medium transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "Sign In"}
              </Button>

              <div className="text-sm text-neutral-500 text-center">
                Don't have an account?{" "}
                <Link href="/register" className="text-white hover:underline decoration-violet-500 underline-offset-4">
                  Register
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
