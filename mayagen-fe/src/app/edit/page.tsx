"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload, X, Image as ImageIcon, Wand2, Download,
  RotateCcw, Sliders, Layers, Sparkles, Zap,
  Monitor, Smartphone, Maximize2, Move, Clock,
  History, ChevronRight, Loader2, ArrowRight, Plus
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Compare } from "@/components/ui/compare";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function EditPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [recentEdits, setRecentEdits] = useState<any[]>([]);

  // Dimensions
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);

  // Load recent edits on mount
  useEffect(() => {
    if (user) fetchRecentEdits();
  }, [user]);

  const fetchRecentEdits = async () => {
    try {
      const res = await api.get("/images/me", {
        params: { image_type: "IMAGE_EDIT", limit: 10 }
      });
      if (res.data.success) {
        setRecentEdits(res.data.data.images);
      }
    } catch (err) {
      console.error("Failed to fetch recent edits", err);
    }
  };

  const handleFileSelect = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploadedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Auto-detect dimensions
    const img = new Image();
    img.onload = () => {
      setWidth(img.width);
      setHeight(img.height);
    };
    img.src = url;
    setResult(null); // Reset result on new file
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelect(file);
    }
  };

  const handleSubmit = async () => {
    if (!uploadedFile) return toast.error("Please upload an image first");
    if (!prompt.trim()) return toast.error("Please describe the changes");
    if (!user) return toast.error("Please log in to edit");

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("image", uploadedFile);
      formData.append("prompt", prompt);
      if (negativePrompt) formData.append("negative_prompt", negativePrompt);
      formData.append("width", width.toString());
      formData.append("height", height.toString());
      formData.append("category", "edits");
      formData.append("is_public", "true");

      const res = await api.post("/images/edit", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        toast.info("Request queued...");
        pollForCompletion(res.data.data.id);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Edit failed");
      setIsSubmitting(false);
    }
  };

  const pollForCompletion = async (jobId: number) => {
    try {
      const res = await api.get(`/images/${jobId}`);
      if (res.data.success) {
        const job = res.data.data;
        
        if (job.status === "COMPLETED") {
          setResult(job);
          setIsSubmitting(false);
          toast.success("Image transformed!");
          fetchRecentEdits();
        } else if (job.status === "FAILED") {
          setIsSubmitting(false);
          toast.error("Edit failed: " + (res.data.error || "Unknown error"));
        } else {
          // Still QUEUED or PROCESSING
          setTimeout(() => pollForCompletion(jobId), 1000);
        }
      }
    } catch (e) {
      console.error("Polling error", e);
      setIsSubmitting(false);
      toast.error("Failed to check edit status");
    }
  };

  const loadFromHistory = async (edit: any) => {
    console.log("Loading from history:", edit.id);
    const toastId = toast.loading("Loading image...");
    try {
      const res = await api.get(`/images/${edit.id}`);
      console.log("API Response:", res.data);

      if (res.data.success) {
        const fullEdit = res.data.data;
        console.log("Full Edit Data:", fullEdit);

        // Check for input_image_url OR fallback to use the result image itself as input
        const imageUrlToLoad = fullEdit.input_image_url || fullEdit.url;

        if (imageUrlToLoad) {
          console.log("Found image URL, setting state...", imageUrlToLoad);

          // Create a dummy file to satisfy the !uploadedFile check so the UI switches to "Edit Mode"
          const dummyFile = new File([""], "history_image.png", { type: "image/png" });
          setUploadedFile(dummyFile);

          // Directly set the URL
          setPreviewUrl(imageUrlToLoad);

          // Restore other state
          setWidth(fullEdit.width);
          setHeight(fullEdit.height);
          setPrompt(fullEdit.edit_prompt || fullEdit.prompt || "");
          setResult(fullEdit);

          toast.dismiss(toastId);
          if (!fullEdit.input_image_url) {
            toast.info("Original input not found, loaded result as input.");
          }
        } else {
          console.log("No input image URL found");
          toast.dismiss(toastId);
          toast.error("Original input image not found for this edit.");
          // Fallback to detail view
          router.push(`/image/${edit.id}`);
        }
      }
    } catch (e) {
      toast.dismiss(toastId);
      console.error("Failed to load history item", e);
      toast.error("Could not load history item");
    }
  };

  const Presets = [
    { label: "Sunset", prompt: "Golden hour sunset lighting, warm tones", icon: Sparkles },
    { label: "Cyberpunk", prompt: "Cyberpunk style, neon lights, futuristic city", icon: Zap },
    { label: "Oil Paint", prompt: "Oil painting style, textured brushstrokes", icon: Layers },
    { label: "BW", prompt: "Black and white dramatic photography", icon: Sliders },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#0a0a0a] text-neutral-200 lg:overflow-hidden font-sans overflow-auto">

      {/* ─── CENTER: CANVAS ────────────────────────────── */}
      <main className="flex-1 flex flex-col relative min-w-0 min-h-[60vh] lg:min-h-0">
        <header className="h-16 border-b border-white/[0.06] flex items-center justify-between px-6 bg-[#0a0a0a] shrink-0">
          <h1 className="text-lg font-medium text-white tracking-tight">Image Adjustment</h1>
          <div className="flex items-center gap-2">
            <div className="bg-neutral-800/50 rounded-lg px-3 py-1.5 text-xs font-mono text-neutral-400">
              {width} x {height}
            </div>
          </div>
        </header>

        {/* DEBUG OVERLAY REMOVED */}

        {/* Canvas Area */}
        <div className="flex-1 overflow-visible lg:overflow-hidden relative flex items-center justify-center bg-[#050505] bg-grid-white/[0.02] py-8 lg:py-0">
          {/* Ambient Glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-[200px] lg:w-[500px] h-[200px] lg:h-[500px] bg-violet-500/5 rounded-full blur-[120px]" />
          </div>

          {/* Content Container */}
          <div className="relative z-10 w-full h-full max-w-5xl max-h-[50vh] lg:max-h-[65vh] p-4 lg:p-6 flex items-center justify-center">

            {!uploadedFile ? (
              /* Upload State */
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="group w-full max-w-[300px] aspect-square rounded-3xl border-2 border-dashed border-white/10 hover:border-violet-500/30 hover:bg-white/[0.02] flex flex-col items-center justify-center cursor-pointer transition-all mx-auto"
              >
                <div className="w-16 h-16 rounded-full bg-white/[0.03] group-hover:bg-violet-500/10 flex items-center justify-center mb-4 transition-colors">
                  <Plus className="w-8 h-8 text-neutral-500 group-hover:text-violet-400 transition-colors" />
                </div>
                <p className="text-neutral-300 font-medium">Upload Image</p>
                <p className="text-xs text-neutral-500 mt-1">or drag & drop</p>
              </div>
            ) : (
              /* Edit/Result State */
              <div className="relative w-full h-full flex items-center justify-center">
                {result ? (


                  <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 mx-auto w-full h-full">
                    <Compare
                      key={result.id}
                      firstImage={previewUrl || ""}
                      secondImage={result.url}
                      firstImageClassName="object-contain w-full h-full"
                      secondImageClassname="object-contain w-full h-full"
                      className="w-full h-full"
                      slideMode="drag"
                    />
                  </div>

                ) : (
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 mx-auto flex items-center justify-center"
                    style={{ maxHeight: '100%', maxWidth: '100%' }}>
                    <img
                      src={previewUrl!}
                      className="max-h-[50vh] lg:max-h-[65vh] max-w-full object-contain block"
                      alt="Original"
                    />

                    {isSubmitting && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
                        <Loader2 className="w-10 h-10 text-violet-500 animate-spin mb-3" />
                        <p className="text-white font-medium">Processing...</p>
                      </div>
                    )}

                    <div className="absolute top-4 right-4">
                      <button onClick={() => { setUploadedFile(null); setPreviewUrl(null); }} className="p-2 bg-black/50 backdrop-blur rounded-full hover:bg-black/70 text-white transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
            {/* Debug Section Removed */}
          </div>
        </div>

        {/* ─── BOTTOM: FILMSTRIP ─── */}
        <div className="h-32 lg:h-40 border-t border-white/[0.06] bg-[#0a0a0a] flex flex-col shrink-0">
          <div className="h-8 flex items-center px-4 border-b border-white/[0.04] gap-2">
            <History className="w-3 h-3 text-neutral-500" />
            <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Recent Edits</span>
          </div>
          <div className="flex-1 overflow-x-auto p-4 flex gap-3 no-scrollbar">
            {/* New Project Button */}
            <button 
              onClick={() => {
                setUploadedFile(null);
                setPreviewUrl(null);
                setResult(null);
                setPrompt("");
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="group min-w-[100px] h-full rounded-xl border border-white/[0.06] hover:border-violet-500/50 hover:bg-white/[0.02] flex flex-col items-center justify-center gap-2 transition-all shrink-0"
            >
              <div className="w-8 h-8 rounded-full bg-white/[0.05] group-hover:bg-violet-500/10 flex items-center justify-center transition-colors">
                <Plus className="w-4 h-4 text-neutral-400 group-hover:text-violet-400" />
              </div>
              <span className="text-[10px] font-medium text-neutral-400 group-hover:text-violet-200">New</span>
            </button>

            {recentEdits.length === 0 ? (
              <div className="flex items-center justify-center px-4 text-xs text-neutral-600 italic">
                No recent edits yet
              </div>
            ) : (
              recentEdits.map((edit) => {
                const isActive = result?.id === edit.id;
                return (
                  <button
                    key={edit.id}
                    onClick={() => loadFromHistory(edit)}
                    className={`relative group min-w-[100px] h-full rounded-xl overflow-hidden transition-all ${isActive
                        ? "border-2 border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.3)] scale-[1.02]"
                        : "border border-white/[0.06] hover:border-violet-500/50 hover:scale-[1.02]"
                      }`}
                  >
                    <img
                      src={edit.url || ""}
                      className={`w-full h-full object-cover transition-opacity ${isActive ? "opacity-100" : "opacity-60 group-hover:opacity-100"
                        }`}
                      alt=""
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t from-black/80 to-transparent transition-opacity flex flex-col justify-end p-2 ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}>
                      <p className="text-[10px] text-white truncate w-full">{edit.prompt}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* ─── RIGHT: PROPERTIES ────────────────────────────── */}
      <aside className="w-full lg:w-80 h-auto lg:h-full border-t lg:border-t-0 lg:border-l border-white/[0.06] bg-[#0a0a0a] flex flex-col shrink-0 pb-10 lg:pb-0">
        <div className="h-16 flex items-center px-5 border-b border-white/[0.06]">
          <span className="text-sm font-medium text-white">Properties</span>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* Prompt Section */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Prompt</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe your edit..."
              className="w-full h-32 bg-[#131313] border border-white/[0.08] rounded-xl p-3 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 resize-none transition-all"
            />
          </div>

          {/* Presets Grid */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Presets</label>
            <div className="grid grid-cols-2 gap-2">
              {Presets.map(p => (
                <button
                  key={p.label}
                  onClick={() => { setPrompt(p.prompt); setActivePreset(p.label); }}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${activePreset === p.label
                      ? "bg-violet-500/10 border-violet-500/50 text-violet-400"
                      : "bg-[#131313] border-white/[0.06] text-neutral-400 hover:bg-white/[0.05]"
                    }`}
                >
                  <p.icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dimensions Info */}
          <div className="p-4 rounded-xl bg-[#131313] border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400">Dimensions</span>
              <span className="text-xs text-white font-mono">{width} x {height}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400">File Type</span>
              <span className="text-xs text-white">{uploadedFile?.type.split('/')[1]?.toUpperCase() || "-"}</span>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!uploadedFile || isSubmitting}
            className={`w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${!uploadedFile
                ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                : isSubmitting
                  ? "bg-neutral-800 text-neutral-400"
                  : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-violet-500/20 hover:shadow-violet-500/40 hover:scale-[1.02]"
              }`}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {isSubmitting ? "Generating..." : "Generate Edit"}
          </button>

        </div>
      </aside>
    </div>
  );
}
