'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from "@/lib/api";
import { Loader2, AlertCircle, Layers, Grid, LayoutDashboard, Download, Globe, ExternalLink } from "lucide-react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Types for Public View
interface SharedBatch {
  id: number;
  name: string;
  category: string;
  target_subject: string;
  status: string;
  total_images: number;
  generated_count: number;
  progress: number;
  model: string;
  created_at: string;
  created_by: string;
}

interface SharedImage {
  id: number;
  filename: string;
  url: string;
  prompt: string;
  width: number;
  height: number;
  is_public: boolean;
}

export default function SharedBatchPage() {
  const params = useParams();
  const token = params?.token as string;
  
  const [batch, setBatch] = useState<SharedBatch | null>(null);
  const [images, setImages] = useState<SharedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('grid');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingImages, setLoadingImages] = useState(false);

  useEffect(() => {
    if (token) {
        fetchBatchData();
    }
  }, [token]);

  useEffect(() => {
    if (token && batch) {
        fetchImages(1);
    }
  }, [batch]);

  const fetchBatchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/batch/shared/${token}`);
      if (res.data.success) {
        setBatch(res.data.data);
      }
    } catch (e: any) {
        // If 404
        setBatch(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchImages = async (pageNum: number) => {
    try {
      setLoadingImages(true);
      const res = await api.get(`/batch/shared/${token}/images`, {
        params: { page: pageNum, limit: 24 }
      });
      
      if (res.data.success) {
        if (pageNum === 1) {
            setImages(res.data.data.images);
        } else {
            setImages(prev => [...prev, ...res.data.data.images]);
        }
        setTotalPages(res.data.data.meta.total_pages);
        setPage(pageNum);
      }
    } catch (e) {
      console.error("Failed to load images", e);
    } finally {
      setLoadingImages(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-indigo-500">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 text-neutral-400 p-4">
        <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
        <h1 className="text-xl font-bold text-white">Batch Not Found</h1>
        <p className="mt-2 text-center max-w-md">
          The share link might be invalid, expired, or revoked by the owner.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-24">
      {/* Read-Only Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-30 backdrop-blur-md bg-opacity-80">
        <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 mt-1">
                        <Globe className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                             <h1 className="text-2xl font-bold text-white">{batch.name}</h1>
                             <Badge variant="outline" className="text-indigo-400 border-indigo-500/30 bg-indigo-500/10">Public View</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-neutral-400 mt-1">
                            <span>Shared by <strong className="text-neutral-300">{batch.created_by}</strong></span>
                            <span>•</span>
                            <span>{images.length} images loaded</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between w-full md:w-auto gap-4">
                    <span className="flex items-center gap-2 text-sm text-neutral-400 bg-neutral-800/50 px-3 py-1.5 rounded-lg border border-neutral-800">
                        <span className="text-neutral-500 uppercase text-xs font-semibold tracking-wider">Object</span>
                        <span className="text-neutral-200 font-medium">{batch.target_subject}</span>
                    </span>

                    <div className="flex bg-neutral-800 rounded-lg p-1 border border-neutral-700">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-300'}`}
                            title="Grid View"
                        >
                            <LayoutDashboard className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setViewMode('masonry')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'masonry' ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-300'}`}
                            title="Masonry View"
                        >
                            <Grid className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {images.length === 0 ? (
             <div className="text-center py-20 bg-neutral-900/50 rounded-xl border border-neutral-800 border-dashed">
                <Layers className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                <p className="text-neutral-400">No images available for this batch yet.</p>
             </div>
        ) : (
            <>
                {viewMode === 'masonry' ? (
                    <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                        {images.map((img) => (
                            <div key={img.id} className="break-inside-avoid mb-4 relative group overflow-hidden rounded-xl bg-neutral-900 border border-neutral-800">
                                {img.is_public ? (
                                    <Link href={`/image/${img.id}`} className="block cursor-pointer">
                                        <img 
                                            src={img.url} 
                                            alt={img.prompt}
                                            className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                                            loading="lazy"
                                        />
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-black/50 backdrop-blur-md rounded-full text-white">
                                            <ExternalLink className="w-3 h-3" />
                                        </div>
                                    </Link>
                                ) : (
                                    <img 
                                        src={img.url} 
                                        alt={img.prompt}
                                        className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                                        loading="lazy"
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end pointer-events-none">
                                    <p className="text-white text-xs line-clamp-2">{img.prompt}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                         {images.map((img) => (
                            <div key={img.id} className="aspect-square relative group overflow-hidden rounded-xl bg-neutral-900 border border-neutral-800">
                                {img.is_public ? (
                                    <Link href={`/image/${img.id}`} className="block h-full cursor-pointer">
                                        <img 
                                            src={img.url} 
                                            alt={img.prompt}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            loading="lazy"
                                        />
                                         <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-black/50 backdrop-blur-md rounded-full text-white z-10">
                                            <ExternalLink className="w-3 h-3" />
                                        </div>
                                    </Link>
                                ) : (
                                    <img 
                                        src={img.url} 
                                        alt={img.prompt}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        loading="lazy"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                )}
                
                {/* Load More */}
                {page < totalPages && (
                    <div className="mt-8 flex justify-center">
                        <Button 
                            variant="secondary" 
                            onClick={() => fetchImages(page + 1)} 
                            disabled={loadingImages}
                            className="bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white"
                        >
                            {loadingImages ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Load More Images
                        </Button>
                    </div>
                )}
            </>
        )}
      </main>
    </div>
  );
}
