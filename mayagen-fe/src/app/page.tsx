'use client';

import { useState, useEffect } from 'react';
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Image as ImageIcon, AlertCircle, Cpu, Layers, FolderOpen, LogOut, User, Lock, Settings } from "lucide-react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [prompt, setPrompt] = useState('');
  const [width, setWidth] = useState(512);
  const [height, setHeight] = useState(768);
  const [provider, setProvider] = useState('comfyui');
  const [model, setModel] = useState('sd15');
  const [category, setCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [gallery, setGallery] = useState<{url: string, filename: string, category: string, created_by: string}[]>([]);

  // Fetch Gallery
  const fetchGallery = async () => {
      try {
          // Use api client but it works without token too (public endpoint)
          const res = await api.get('/images');
          setGallery(res.data.images);
      } catch (e) {
          console.error("Failed to fetch gallery", e);
      }
  };

  // Initial Load
  useEffect(() => {
    fetchGallery();
  }, []);

  const generateImage = async () => {
    if (!prompt) return;
    if (!user) {
        router.push("/login");
        return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post('/generate', {
          prompt,
          filename_prefix: "mayagen_ui",
          width,
          height,
          provider,
          model,
          category: category || "uncategorized"
      });

      if (response.data.status === 'success') {
        fetchGallery(); // Refresh gallery to show new image
      } else {
        setError("Generation failed without details.");
      }

    } catch (err: any) {
        setError(err.response?.data?.detail || err.message || "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) return null; // Or a loading spinner

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 overflow-hidden font-sans">
      
      {/* Sidebar: Controls */}
      <aside className="w-96 flex-shrink-0 border-r border-neutral-800 bg-neutral-900/50 backdrop-blur p-6 overflow-y-auto hidden md:block">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-indigo-400" />
                <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">MayaGen</span>
            </div>
             {user ? (
                 <div className="flex items-center gap-2">
                     <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-800 text-xs">
                        <User className="w-3 h-3 text-indigo-400" />
                        <span className="text-neutral-300 max-w-[80px] truncate">{user.username}</span>
                     </div>
                     <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500 hover:text-red-400" onClick={logout} title="Sign Out">
                         <LogOut className="w-4 h-4" />
                     </Button>
                 </div>
             ) : (
                 <Link href="/login">
                     <Button size="sm" variant="outline" className="h-8 text-xs border-indigo-500/50 text-indigo-400 hover:bg-indigo-950">
                         Sign In
                     </Button>
                 </Link>
             )}
        </div>

        {/* Auth Barrier for non-logged in users */}
        {!user && (
            <div className="mb-6 p-4 rounded-lg bg-indigo-950/30 border border-indigo-500/30 text-center">
                 <Lock className="w-5 h-5 mx-auto text-indigo-400 mb-2" />
                 <h3 className="text-sm font-medium text-indigo-200">Studio Locked</h3>
                 <p className="text-xs text-indigo-300/70 mb-3">Sign in to start creating</p>
                 <Link href="/login">
                    <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700">Login to Generate</Button>
                 </Link>
            </div>
        )}

        <div className={`space-y-6 ${!user ? 'opacity-50 pointer-events-none blur-[1px]' : ''}`}>
            
            {/* Prompt */}
            <div className="space-y-2">
                <Label htmlFor="prompt" className="flex items-center gap-2 text-neutral-300">
                    <Layers className="w-4 h-4" /> Prompt
                </Label>
                <textarea 
                    id="prompt" 
                    placeholder="Describe your imagination..." 
                    className="w-full min-h-[100px] p-3 rounded-md bg-neutral-950 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-y"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                />
            </div>

            {/* Provider */}
            <div className="space-y-2">
                <Label className="flex items-center gap-2 text-neutral-300">
                    <Cpu className="w-4 h-4" /> Provider
                </Label>
                <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger className="bg-neutral-950 border-neutral-700">
                        <SelectValue placeholder="Select Provider" />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-900 border-neutral-700 text-neutral-100">
                        <SelectItem value="comfyui">Azure ComfyUI</SelectItem>
                        <SelectItem value="openai">OpenAI (Mock)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Model (Only if ComfyUI) */}
            {provider === 'comfyui' && (
                <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-neutral-300">
                        <Layers className="w-4 h-4" /> Model
                    </Label>
                    <Select value={model} onValueChange={setModel}>
                        <SelectTrigger className="bg-neutral-950 border-neutral-700">
                            <SelectValue placeholder="Select Model" />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-900 border-neutral-700 text-neutral-100">
                            <SelectItem value="sd15">DreamShaper 8 (Best Quality)</SelectItem>
                            <SelectItem value="lcm">SD 1.5 Base (Standard)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Category */}
            <div className="space-y-2">
                <Label htmlFor="category" className="flex items-center gap-2 text-neutral-300">
                    <FolderOpen className="w-4 h-4" /> Category
                </Label>
                <Input 
                    id="category" 
                    placeholder="e.g. portraits" 
                    className="bg-neutral-950 border-neutral-700"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                />
            </div>

            {/* Resolution */}
            <div className="space-y-2">
                <Label className="flex items-center gap-2 text-neutral-300">
                    <Settings className="w-4 h-4" /> Resolution
                </Label>
                <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                        <span className="absolute left-2 top-2 text-xs text-neutral-500">W</span>
                        <Input 
                            type="number" 
                            className="bg-neutral-950 border-neutral-700 pl-6"
                            value={width}
                            onChange={(e) => setWidth(Number(e.target.value))}
                        />
                    </div>
                    <div className="relative">
                        <span className="absolute left-2 top-2 text-xs text-neutral-500">H</span>
                        <Input 
                            type="number" 
                            className="bg-neutral-950 border-neutral-700 pl-6"
                            value={height}
                            onChange={(e) => setHeight(Number(e.target.value))}
                        />
                    </div>
                </div>
            </div>

            {/* Generate Button */}
            <Button 
                className="w-full h-12 text-base bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-transform"
                onClick={generateImage}
                disabled={isLoading || !prompt}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Generating...
                    </>
                ) : (
                    <>
                        Generate
                        <Sparkles className="ml-2 h-5 w-5" />
                    </>
                )}
            </Button>

            {error && (
                <div className="p-3 rounded-md bg-red-900/20 border border-red-800 text-red-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}
        </div>
      </aside>

      {/* Main Content: Gallery */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <div className="flex items-baseline justify-between mb-8">
              <h1 className="text-3xl font-bold text-neutral-100 flex items-center gap-3">
                  <ImageIcon className="w-8 h-8 text-neutral-500" />
                  Gallery
              </h1>
              <span className="text-neutral-500 text-sm font-mono">{gallery.length} items</span>
          </div>

          {/* Masonry Layout using CSS Columns */}
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
              {gallery.map((img, idx) => (
                  <div key={idx} className="break-inside-avoid relative group rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-indigo-500/50 transition-colors">
                      {/* Image - Natural Aspect Ratio */}
                      <img 
                          src={img.url} 
                          alt={img.filename}
                          className="w-full h-auto block"
                          loading="lazy"
                      />
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                          <div className="flex items-center justify-between">
                              <div className="flex flex-col items-start gap-1">
                                <Badge className="bg-white/10 backdrop-blur hover:bg-white/20 text-white border-none">
                                    {img.category}
                                </Badge>
                                <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {img.created_by || "Anonymous"}
                                </span>
                              </div>
                              <a 
                                  href={img.url} 
                                  target="_blank" 
                                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                                  title="Open Original"
                              >
                                  <FolderOpen className="w-4 h-4" />
                              </a>
                          </div>
                      </div>
                  </div>
              ))}
          </div>
          
          {gallery.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[50vh] text-neutral-500 border-2 border-dashed border-neutral-800 rounded-xl bg-neutral-900/20">
                  <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-lg">Your masterpiece awaits...</p>
                  <p className="text-sm opacity-50">Use the sidebar to start generating.</p>
              </div>
          )}
      </main>
    </div>
  );
}
