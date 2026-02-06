"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Download, Share2, Calendar, User, Hash, Layers, Cpu, FolderOpen, Image as ImageIcon, Clock, FileText, Maximize2, Copy, Check, Globe, Lock } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";

interface ImageDetail {
  id: number;
  user_id: number;
  filename: string;
  url: string | null;
  prompt: string;
  width: number;
  height: number;
  model: string;
  provider: string;
  category: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  status: string;
  is_public: boolean;
}

// Model Display Names
const MODEL_NAMES: Record<string, string> = {
  sd15: "DreamShaper 8",
  lcm: "SD 1.5 Base (LCM)",
};

export default function ImageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [image, setImage] = useState<ImageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const fetchImage = async () => {
      try {
        const res = await api.get(`/images/${params.id}`);
        if (res.data.success) {
          setImage(res.data.data);
        } else {
          toast.error(res.data.message || "Failed to load image");
        }
      } catch (err: any) {
        console.error("Error fetching image:", err);
        // If 403, might handle differently, but toast error works for now
        if (err.response?.status === 403) {
            toast.error("Access Denied: Private Image");
        } else {
            toast.error(err.response?.data?.error || "Failed to load image details");
        }
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchImage();
    }
  }, [params.id]);

  const copyPrompt = () => {
    if (image?.prompt) {
      navigator.clipboard.writeText(image.prompt);
      setCopied(true);
      toast.success("Prompt copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = async () => {
    if (!image?.url) return;
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = image.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success("Download started!");
    } catch (e) {
      toast.error("Download failed");
    }
  };

  const toggleVisibility = async () => {
    if (!image || toggling) return;
    setToggling(true);
    try {
      const newStatus = !image.is_public;
      const res = await api.patch(`/images/${image.id}`, { is_public: newStatus });
      if (res.data.success) {
        setImage({ ...image, is_public: newStatus });
        toast.success(newStatus ? "Image is now Public" : "Image is now Private");
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to update visibility");
    } finally {
      setToggling(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          <span className="text-neutral-400 text-sm">Loading image details...</span>
        </div>
      </div>
    );
  }

  if (!image) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 text-white gap-4">
        <ImageIcon className="w-16 h-16 text-neutral-700" />
        <h1 className="text-2xl font-bold text-red-400">Image Not Found</h1>
        <p className="text-neutral-500">The image you're looking for doesn't exist or has been removed (or is private).</p>
        <Button onClick={() => router.push("/")} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Gallery
        </Button>
      </div>
    );
  }

  const isProcessing = image.status === 'PENDING' || image.status === 'PROCESSING';
  const isOwner = user && image && Number(user.id) === Number(image.user_id);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-neutral-950/80 border-b border-neutral-800 px-6 py-3 flex items-center justify-between">
        <Button
          onClick={() => router.push("/")}
          variant="ghost"
          size="sm"
          className="hover:bg-neutral-900 text-neutral-400 hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Gallery
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-neutral-400 border-neutral-700 font-mono">
            <Hash className="w-3 h-3 mr-1" /> {image.id}
          </Badge>
          <Badge className={`${image.status === 'COMPLETED' ? 'bg-green-900/30 text-green-400 border-green-700/50' :
            image.status === 'FAILED' ? 'bg-red-900/30 text-red-400 border-red-700/50' :
              'bg-yellow-900/30 text-yellow-400 border-yellow-700/50'
            } capitalize`}>
            {image.status.toLowerCase()}
          </Badge>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-57px)] lg:h-[calc(100vh-57px)]">
        {/* Image Panel (Left) */}
        <div className="flex-1 flex items-center justify-center bg-neutral-950 relative overflow-hidden min-h-[50vh] lg:min-h-0 group">
          
          {/* Backdrop Blur Effect */}
          {image?.url && !isProcessing && (
            <div className="absolute inset-0 z-0 pointer-events-none">
              <Image
                src={image.url}
                alt="background-blur"
                fill
                className="object-cover opacity-20 blur-3xl scale-110 saturate-150"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-neutral-950/20" />
            </div>
          )}

          {isProcessing ? (
            <div className="relative z-10 flex flex-col items-center justify-center gap-6 text-center animate-pulse">
              <div className="relative">
                <div className="w-32 h-32 rounded-full border-4 border-indigo-500/30 flex items-center justify-center">
                  <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
                </div>
              </div>
              <h2 className="text-2xl font-semibold text-indigo-300">Generating Masterpiece...</h2>
              <p className="text-neutral-500 max-w-md">Your image is being processed by AI. This typically takes 10-30 seconds depending on model and resolution.</p>
              <div className="flex gap-2 text-xs text-neutral-600 mt-4">
                <span className="px-2 py-1 bg-neutral-800 rounded">{image.model}</span>
                <span className="px-2 py-1 bg-neutral-800 rounded">{image.width}x{image.height}</span>
              </div>
            </div>
          ) : image.url ? (
            <div className="relative z-10 w-full h-full flex items-center justify-center p-0 transition-all duration-300">
              <Image
                src={image.url}
                alt={image.prompt}
                width={image.width}
                height={image.height}
                className="object-contain max-w-full max-h-full shadow-2xl shadow-black/80"
                priority
                unoptimized
              />
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                onClick={() => window.open(image.url!, '_blank')}
              >
                <Maximize2 className="w-5 h-5" />
              </Button>
            </div>
          ) : (
            <div className="relative z-10 flex flex-col items-center gap-4 text-neutral-500">
              <ImageIcon className="w-20 h-20 opacity-20" />
              <span>Image not available</span>
            </div>
          )}
        </div>

        {/* Details Panel (Right) */}
        <aside className="w-full lg:w-[420px] flex-shrink-0 border-t lg:border-t-0 lg:border-l border-neutral-800 bg-neutral-900/50 lg:overflow-y-auto">
          <div className="p-6 space-y-6">

            {/* Prompt Section */}
            <Card className="bg-neutral-800/50 border-neutral-700">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2 text-neutral-300">
                    <FileText className="w-4 h-4" /> Prompt
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={copyPrompt} className="h-7 text-xs text-neutral-500 hover:text-white hover:bg-neutral-700/50">
                    {copied ? <Check className="w-3 h-3 mr-1 text-green-400" /> : <Copy className="w-3 h-3 mr-1" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-neutral-200 whitespace-pre-wrap">
                  {image.prompt}
                </p>
              </CardContent>
            </Card>

            {/* Technical Details */}
            <Card className="bg-neutral-800/50 border-neutral-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-neutral-300">
                  <Layers className="w-4 h-4" /> Technical Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <DetailItem icon={<Cpu className="w-4 h-4" />} label="Model" value={MODEL_NAMES[image.model] || image.model} />
                  <DetailItem icon={<Layers className="w-4 h-4" />} label="Provider" value={image.provider} />
                  <DetailItem icon={<ImageIcon className="w-4 h-4" />} label="Resolution" value={`${image.width} × ${image.height}`} />
                  <DetailItem icon={<FolderOpen className="w-4 h-4" />} label="Category" value={image.category} />
                </div>
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card className="bg-neutral-800/50 border-neutral-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-neutral-300">
                  <Hash className="w-4 h-4" /> Metadata
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <MetaItem icon={<Hash className="w-3.5 h-3.5" />} label="Image ID" value={`#${image.id}`} />
                  <MetaItem icon={<FileText className="w-3.5 h-3.5" />} label="Filename" value={image.filename} mono />
                  <MetaItem icon={<User className="w-3.5 h-3.5" />} label="Created By" value={image.created_by} />
                  <MetaItem icon={<Calendar className="w-3.5 h-3.5" />} label="Created" value={new Date(image.created_at).toLocaleString()} />
                  {image.updated_at && (
                    <MetaItem icon={<Clock className="w-3.5 h-3.5" />} label="Updated" value={new Date(image.updated_at).toLocaleString()} />
                  )}
                  {/* Visibility Status */}
                  <MetaItem 
                    icon={image.is_public ? <Globe className="w-3.5 h-3.5 text-neutral-400" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />} 
                    label="Visibility" 
                    value={image.is_public ? "Public" : "Private"} 
                  />
                </div>
              </CardContent>
            </Card>

            <hr className="border-neutral-800" />

            {/* Actions */}
            <div className="space-y-3">
              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={handleDownload}
                  disabled={isProcessing}
                >
                  <Download className="mr-2 h-4 w-4" /> Download
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 bg-transparent border-neutral-700 hover:bg-neutral-800 text-neutral-300 hover:text-white"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success("Link copied!");
                  }}
                >
                  <Share2 className="mr-2 h-4 w-4" /> Share
                </Button>
              </div>

               {/* Owner Actions */}
               {isOwner && (
                 <Button
                   variant="ghost"
                   onClick={toggleVisibility}
                   disabled={toggling}
                   className={`w-full border transition-all ${
                     image.is_public 
                       ? "border-neutral-700 bg-black/20 hover:bg-neutral-800 text-neutral-400 hover:text-white" 
                       : "border-amber-500/30 bg-amber-900/10 text-amber-500 hover:bg-amber-900/20"
                   }`}
                 >
                   {toggling ? (
                     <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                   ) : image.is_public ? (
                     <Globe className="w-4 h-4 mr-2" />
                   ) : (
                     <Lock className="w-4 h-4 mr-2" />
                   )}
                   {image.is_public ? "Public Image (Visible to everyone)" : "Private Image (Only you can see this)"}
                 </Button>
               )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// Helper Components
function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-neutral-500 text-xs">
        {icon} {label}
      </div>
      <p className="text-neutral-200 font-medium capitalize text-sm">{value}</p>
    </div>
  );
}

function MetaItem({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-neutral-800/50 last:border-0">
      <span className="flex items-center gap-2 text-neutral-500">
        {icon} {label}
      </span>
      <span className={`text-neutral-300 ${mono ? 'font-mono text-xs' : ''} truncate max-w-[180px]`} title={value}>
        {value}
      </span>
    </div>
  );
}
