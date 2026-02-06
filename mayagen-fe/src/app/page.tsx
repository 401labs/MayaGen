'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, Send, Image as ImageIcon, Zap, Layers, Settings2, ChevronDown, ArrowRight, Lock, Wand2, Database, Cpu, FolderOpen } from "lucide-react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from "sonner";

interface RecentImage {
  id: number;
  url: string;
  filename: string;
  prompt: string;
  category: string;
  model: string;
  created_by: string;
}

const MODEL_DISPLAY: Record<string, string> = {
  sd15: "DreamShaper 8",
  lcm: "SD 1.5 Base",
};

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recentImages, setRecentImages] = useState<RecentImage[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Advanced Settings
  const [width, setWidth] = useState(512);
  const [height, setHeight] = useState(512);
  const [provider, setProvider] = useState('comfyui');
  const [model, setModel] = useState('sd15');
  const [category, setCategory] = useState('');

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [prompt]);

  // Fetch recent completed images
  useEffect(() => {
    const fetchRecent = async () => {
      setRecentLoading(true);
      try {
        const res = await api.get('/images/recent?limit=8');
        if (res.data.success) {
          setRecentImages(res.data.data.images);
        }
      } catch (e) {
        console.error("Failed to fetch recent", e);
      } finally {
        setRecentLoading(false);
      }
    };
    fetchRecent();
  }, []);

  const generateImage = async () => {
    if (!prompt.trim()) { toast.error("Please enter a prompt"); return; }
    if (!category.trim()) { 
      toast.error("Category is required");
      setShowAdvanced(true);
      return; 
    }
    if (!user) {
      router.push("/login");
      return;
    }
    
    setIsLoading(true);

    try {
      const response = await api.post('/generate', {
        prompt: prompt.trim(),
        filename_prefix: "mayagen_ui",
        width,
        height,
        provider,
        model,
        category: category || "uncategorized"
      });

      if (response.data.success) {
        toast.success("Generation started! Check the gallery.");
        setPrompt('');
        router.push('/gallery');
      } else {
        toast.error("Generation failed");
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || "An error occurred";
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      generateImage();
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-28">
      
      {/* Hero Section */}
      <section className="relative pt-16 pb-8 px-4">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-8">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-medium text-indigo-300">Synthetic Data Generation</span>
          </div>
          
          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
              Create stunning
            </span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              AI-generated images
            </span>
          </h1>
          
          <p className="text-lg text-neutral-400 max-w-xl mx-auto mb-10">
            Train your ML models with high-quality synthetic data. Perfect for research, prototyping, and production datasets.
          </p>
        </div>
      </section>

      {/* Prompt Input Section */}
      <section className="px-4 mb-16">
        <div className="max-w-2xl mx-auto">
          <div className={`relative bg-neutral-900/80 backdrop-blur-sm rounded-2xl border ${user ? 'border-neutral-700 focus-within:border-indigo-500/50 focus-within:shadow-lg focus-within:shadow-indigo-500/10' : 'border-neutral-800/50'} transition-all`}>
            
            {/* Not logged in overlay */}
            {!user && (
              <div className="absolute inset-0 bg-neutral-900/90 backdrop-blur-sm rounded-2xl z-10 flex flex-col items-center justify-center gap-4">
                <div className="p-4 rounded-full bg-neutral-800">
                  <Lock className="w-8 h-8 text-neutral-500" />
                </div>
                <div className="text-center">
                  <p className="text-neutral-300 font-medium mb-1">Sign in to start generating</p>
                  <p className="text-sm text-neutral-500">Create an account to unlock AI image generation</p>
                </div>
                <Link href="/login">
                  <Button className="bg-indigo-600 hover:bg-indigo-700 mt-2">
                    Login to Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            )}

            <div className="p-4">
              <textarea
                ref={textareaRef}
                placeholder="A futuristic cityscape at sunset, flying cars, neon lights, cyberpunk style..."
                className="w-full min-h-[80px] max-h-[200px] bg-transparent text-white placeholder:text-neutral-500 focus:outline-none resize-none text-lg selection:bg-indigo-500 selection:text-white"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                disabled={!user}
              />
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-neutral-800 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-neutral-400 hover:text-white hover:bg-neutral-800 h-8 px-3 text-xs"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  disabled={!user}
                >
                  <Settings2 className="w-4 h-4 mr-1.5" />
                  Settings
                  <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                </Button>
                
                {user && (
                  <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-500">
                    <span className="px-2 py-1 rounded bg-neutral-800/50">{MODEL_DISPLAY[model]}</span>
                    <span className="px-2 py-1 rounded bg-neutral-800/50">{width}×{height}</span>
                  </div>
                )}
              </div>

              <Button
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed h-10 px-6"
                onClick={generateImage}
                disabled={isLoading || !prompt.trim() || !user}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </div>

            {/* Advanced Settings Panel */}
            {showAdvanced && user && (
              <div className="border-t border-neutral-800 p-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-neutral-400 flex items-center gap-1.5">
                      <FolderOpen className="w-3.5 h-3.5" /> Category*
                    </label>
                    <Input
                      placeholder="animals/cats"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="h-9 bg-neutral-800 border-neutral-700 text-sm"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs text-neutral-400 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" /> Model
                    </label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger className="h-9 bg-neutral-800 border-neutral-700 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-900 border-neutral-700 text-neutral-200">
                        <SelectItem value="sd15">DreamShaper 8</SelectItem>
                        <SelectItem value="lcm">SD 1.5 Base</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-neutral-400 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5" /> Provider
                    </label>
                    <Select value={provider} onValueChange={setProvider}>
                      <SelectTrigger className="h-9 bg-neutral-800 border-neutral-700 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-900 border-neutral-700 text-neutral-200">
                        <SelectItem value="comfyui">ComfyUI</SelectItem>

                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-neutral-400">Width</label>
                    <Select value={String(width)} onValueChange={(v) => setWidth(Number(v))}>
                      <SelectTrigger className="h-9 bg-neutral-800 border-neutral-700 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-900 border-neutral-700 text-neutral-200">
                        <SelectItem value="512">512px</SelectItem>
                        <SelectItem value="768">768px</SelectItem>
                        <SelectItem value="1024">1024px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-neutral-400">Height</label>
                    <Select value={String(height)} onValueChange={(v) => setHeight(Number(v))}>
                      <SelectTrigger className="h-9 bg-neutral-800 border-neutral-700 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-900 border-neutral-700 text-neutral-200">
                        <SelectItem value="512">512px</SelectItem>
                        <SelectItem value="768">768px</SelectItem>
                        <SelectItem value="1024">1024px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompts */}
          <div className="flex flex-wrap gap-2 mt-6 justify-center">
            {[
              "A majestic lion in the savanna",
              "Underwater coral reef ecosystem",
              "Mountain landscape at golden hour",
              "Abstract geometric patterns"
            ].map((suggestion) => (
              <button
                key={suggestion}
                className="px-4 py-2 text-sm text-neutral-400 bg-neutral-900/50 hover:bg-neutral-800 hover:text-white rounded-full border border-neutral-800 transition-all"
                onClick={() => setPrompt(suggestion)}
                disabled={!user}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      {/* <section className="px-4 mb-16">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FeatureCard
              icon={<Database className="w-5 h-5" />}
              title="Synthetic Data"
              description="Generate diverse training datasets for your ML models"
            />
            <FeatureCard
              icon={<Zap className="w-5 h-5" />}
              title="Fast Generation"
              description="Optimized pipelines for quick image generation"
            />
            <FeatureCard
              icon={<Layers className="w-5 h-5" />}
              title="Multiple Models"
              description="Choose from DreamShaper, SD 1.5, and more"
            />
          </div>
        </div>
      </section> */}

      {/* Recent Creations */}
      <section className="px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Recent Creations</h2>
              <p className="text-sm text-neutral-500 mt-1">Latest AI-generated images from the community</p>
            </div>
            <Link href="/gallery" className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
              View Gallery <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {recentLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-square rounded-xl bg-neutral-900 animate-pulse" />
              ))}
            </div>
          ) : recentImages.length === 0 ? (
            <div className="text-center py-16 text-neutral-500">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No images yet. Be the first to generate!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recentImages.map((img) => (
                <Link
                  key={img.id}
                  href={`/image/${img.id}`}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-indigo-500/50 transition-all duration-300"
                >
                  <img
                    src={img.url}
                    alt={img.prompt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-xs line-clamp-2 font-medium">{img.prompt}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-5 rounded-xl bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-3">
        {icon}
      </div>
      <h3 className="font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-neutral-400">{description}</p>
    </div>
  );
}
