'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, RefreshCw, Image as ImageIcon, Grid, LayoutGrid, CheckCircle, Clock, AlertCircle, Layers, Cpu, Calendar, FolderOpen, Maximize } from "lucide-react";
import Link from 'next/link';
import { toast } from "sonner";

interface BatchJob {
  id: number;
  name: string;
  category: string;
  target_subject: string;
  status: string;
  total_images: number;
  generated_count: number;
  failed_count: number;
  progress: number;
  model: string;
  provider: string;
  width: number;
  height: number;
  created_at: string;
}

interface BatchImage {
  id: number;
  url: string | null;
  filename: string;
  category: string;
  prompt: string;
  model: string;
  status: string;
  created_at: string;
}

const MODEL_NAMES: Record<string, string> = {
  sd15: "DreamShaper 8",
  lcm: "SD 1.5 Base",
  flux: "Flux",
};

export default function BatchViewPage() {
  const params = useParams();
  const batchId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const [batch, setBatch] = useState<BatchJob | null>(null);
  const [images, setImages] = useState<BatchImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('masonry');

  useEffect(() => {
    if (user && batchId) {
      fetchBatchData();
    }
  }, [user, batchId]);

  const fetchBatchData = async () => {
    setLoading(true);
    try {
      const [batchRes, imagesRes] = await Promise.all([
        api.get(`/batch/${batchId}`),
        api.get(`/batch/${batchId}/images`)
      ]);

      if (batchRes.data.success) {
        setBatch(batchRes.data.data);
      }

      if (imagesRes.data.success) {
        const sortedImages = imagesRes.data.data.images.sort((a: BatchImage, b: BatchImage) => {
          const aCompleted = a.status?.toUpperCase() === 'COMPLETED';
          const bCompleted = b.status?.toUpperCase() === 'COMPLETED';

          if (aCompleted && !bCompleted) return -1;
          if (!aCompleted && bCompleted) return 1;

          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setImages(sortedImages);
      }
    } catch (e: any) {
      console.error('Failed to fetch batch data', e);
      toast.error('Failed to load batch');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'generating': return <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />;
      case 'queued': return <Clock className="w-5 h-5 text-amber-400" />;
      case 'failed': return <AlertCircle className="w-5 h-5 text-red-400" />;
      default: return <Clock className="w-5 h-5 text-neutral-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'generating': return 'bg-indigo-500';
      case 'queued': return 'bg-amber-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-neutral-500';
    }
  };

  const completedCount = images.filter(img => img.status?.toUpperCase() === 'COMPLETED').length;
  const processingCount = images.filter(img => ['PENDING', 'PROCESSING'].includes(img.status?.toUpperCase())).length;
  const failedCount = images.filter(img => img.status?.toUpperCase() === 'FAILED').length;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 gap-4">
        <div className="relative">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-ping" />
        </div>
        <p className="text-neutral-400 animate-pulse">Loading batch...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 gap-4">
        <div className="p-4 rounded-full bg-neutral-900 border border-neutral-800">
          <Layers className="w-12 h-12 text-neutral-600" />
        </div>
        <h1 className="text-xl font-semibold text-white">Login Required</h1>
        <p className="text-neutral-400">Please sign in to view batch details</p>
        <Link href="/login">
          <Button className="mt-2 bg-indigo-600 hover:bg-indigo-500 transition-all hover:scale-105">
            Sign In
          </Button>
        </Link>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 gap-4">
        <div className="p-4 rounded-full bg-neutral-900 border border-neutral-800">
          <ImageIcon className="w-12 h-12 text-neutral-600" />
        </div>
        <h1 className="text-xl font-semibold text-white">Batch Not Found</h1>
        <p className="text-neutral-400">This batch doesn't exist or you don't have access</p>
        <Link href="/bulk/history">
          <Button variant="outline" className="mt-2 border-neutral-700 text-neutral-300 hover:bg-neutral-800">
            Back to History
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-neutral-950/80 border-b border-neutral-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Top Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link
                href="/bulk/history"
                className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 hover:border-neutral-700 transition-all hover:scale-105"
              >
                <ArrowLeft className="w-5 h-5 text-neutral-300" />
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  {getStatusIcon(batch.status)}
                  <h1 className="text-xl font-semibold text-white">{batch.name}</h1>
                  <Badge
                    className={`capitalize ${
                      batch.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                      batch.status === 'generating' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' :
                      batch.status === 'failed' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                      'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {batch.status}
                  </Badge>
                </div>
                <p className="text-neutral-400 mt-1">{batch.target_subject}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-neutral-900 rounded-xl p-1.5 border border-neutral-800">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-9 w-9 rounded-lg ${viewMode === 'masonry' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'}`}
                  onClick={() => setViewMode('masonry')}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-9 w-9 rounded-lg ${viewMode === 'grid' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'}`}
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchBatchData}
                className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white transition-all"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-900/50 border border-neutral-800/50">
              <FolderOpen className="w-5 h-5 text-indigo-400" />
              <div>
                <p className="text-xs text-neutral-500">Category</p>
                <p className="text-sm font-medium text-white">{batch.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-900/50 border border-neutral-800/50">
              <Cpu className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-xs text-neutral-500">Model</p>
                <p className="text-sm font-medium text-white">{MODEL_NAMES[batch.model] || batch.model}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-900/50 border border-neutral-800/50">
              <Maximize className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-xs text-neutral-500">Size</p>
                <p className="text-sm font-medium text-white">{batch.width}x{batch.height}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-900/50 border border-neutral-800/50">
              <Calendar className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-xs text-neutral-500">Created</p>
                <p className="text-sm font-medium text-white">{new Date(batch.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Progress Section */}
          <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800/50">
            <div className="flex items-center justify-between text-sm mb-3">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  {completedCount} completed
                </span>
                {processingCount > 0 && (
                  <span className="flex items-center gap-2 text-indigo-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {processingCount} processing
                  </span>
                )}
                {failedCount > 0 && (
                  <span className="flex items-center gap-2 text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    {failedCount} failed
                  </span>
                )}
              </div>
              <span className="text-neutral-300 font-medium">
                {batch.generated_count}/{batch.total_images}
                <span className="text-neutral-500 ml-2">({batch.progress}%)</span>
              </span>
            </div>
            <div className="h-2.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getStatusColor(batch.status)}`}
                style={{ width: `${batch.progress}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Gallery */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center">
            <div className="p-4 rounded-full bg-neutral-900 border border-neutral-800 mb-4">
              <ImageIcon className="w-12 h-12 text-neutral-600" />
            </div>
            <p className="text-lg font-medium text-neutral-300 mb-2">No images yet</p>
            <p className="text-neutral-500">Images will appear here as they are generated</p>
          </div>
        ) : viewMode === 'masonry' ? (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {images.map((img, index) => (
              <GalleryCard key={img.id} image={img} index={index} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((img, index) => (
              <GalleryCard key={img.id} image={img} isSquare index={index} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function GalleryCard({ image, isSquare, index }: { image: BatchImage; isSquare?: boolean; index: number }) {
  const status = image.status?.toUpperCase();
  const isProcessing = status === 'PENDING' || status === 'PROCESSING';
  const isFailed = status === 'FAILED';
  const isCompleted = status === 'COMPLETED';

  return (
    <Link
      href={`/image/${image.id}`}
      className={`relative group rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-indigo-500/50 transition-all duration-300 block hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/10 ${isSquare ? '' : 'break-inside-avoid mb-4'}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {isProcessing ? (
        <div className={`${isSquare ? 'aspect-square' : 'aspect-[3/4]'} relative overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900" />
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-indigo-500/30 animate-ping" />
            </div>
            <div className="text-center">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">Generating</span>
              <p className="text-xs text-neutral-400 mt-2 line-clamp-2 max-w-[150px]">{image.prompt?.slice(0, 60)}...</p>
            </div>
          </div>
        </div>
      ) : !isCompleted || !image.url ? (
        <div className={`${isSquare ? 'aspect-square' : 'aspect-[3/4]'} bg-neutral-900 flex flex-col items-center justify-center gap-3`}>
          <div className="p-3 rounded-full bg-neutral-800">
            <ImageIcon className="w-8 h-8 text-neutral-600" />
          </div>
          <span className="text-sm text-neutral-500">{isFailed ? 'Generation Failed' : 'Loading...'}</span>
        </div>
      ) : (
        <img
          src={image.url}
          alt={image.filename}
          className={`w-full ${isSquare ? 'aspect-square object-cover' : 'h-auto'} block`}
          loading="lazy"
        />
      )}

      {/* Hover Overlay */}
      {isCompleted && image.url && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
          <p className="text-white text-sm line-clamp-2 mb-2 font-medium">{image.prompt}</p>
          <Badge className="bg-white/10 backdrop-blur-sm text-white border-none text-xs w-fit">
            {MODEL_NAMES[image.model] || image.model}
          </Badge>
        </div>
      )}

      {/* Status Badge */}
      {!isCompleted && (
        <div className="absolute top-3 right-3">
          <Badge className={`text-xs font-medium ${
            isFailed ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
            isProcessing ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 animate-pulse' :
            'bg-amber-500/20 text-amber-400 border border-amber-500/30'
          }`}>
            {status}
          </Badge>
        </div>
      )}
    </Link>
  );
}
