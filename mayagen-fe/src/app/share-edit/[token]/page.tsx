'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from "@/lib/api";
import { Loader2, AlertCircle, Layers, Grid, LayoutGrid, Download, Globe, ExternalLink, Search, Clock, Image as ImageIcon, Maximize, Copy, FolderOpen, Cpu, Calendar } from "lucide-react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Image from 'next/image';
import { PaginationControl } from "@/components/ui/pagination-control";

// Types for Public View
interface SharedEditBatch {
  id: number;
  name: string;
  original_image_url: string;
  status: string;
  total_variations: number;
  generated_count: number;
  progress: number;
  model: string;
  created_at: string;
  created_by: string;
  variations: any; // Raw json schema
}

interface SharedImage {
  id: number;
  filename: string;
  url: string;
  edit_prompt: string;
  width: number;
  height: number;
  is_public: boolean;
}

export default function SharedEditBatchPage() {
  const params = useParams();
  const token = params?.token as string;
  
  const [batch, setBatch] = useState<SharedEditBatch | null>(null);
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
        fetchImages(1, true);
    }
  }, [batch]);

  const fetchBatchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/edit-batch/shared/${token}`);
      if (res.data.success) {
        setBatch(res.data.data);
      }
    } catch (e: any) {
        setBatch(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchImages = async (pageNum: number, reset: boolean = false) => {
    try {
      setLoadingImages(true);
      const params: any = { page: pageNum, limit: 24 };

      const res = await api.get(`/edit-batch/shared/${token}/images`, { params });
      
      if (res.data.success) {
        if (reset || pageNum === 1) {
            setImages(res.data.data.images);
            setPage(1);
        } else {
            setImages(prev => [...prev, ...res.data.data.images]);
            setPage(pageNum);
        }
        setTotalPages(res.data.data.meta.total_pages);
      }
    } catch (e) {
      console.error("Failed to load images", e);
    } finally {
      setLoadingImages(false);
    }
  };

  const copyLink = () => {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] text-indigo-500">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] text-neutral-400 p-4">
        <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
        <h1 className="text-xl font-bold text-white">Share Link Invalid</h1>
        <p className="mt-2 text-center max-w-md">
          This link might be expired, revoked, or incorrect.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-100 pb-24">
      {/* Read-Only Header */}
      <div className="bg-neutral-900/50 border-b border-neutral-800 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className="mt-1 p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                        <Globe className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                             <h1 className="text-xl font-bold text-white">{batch.name}</h1>
                             <Badge variant="outline" className="text-indigo-400 border-indigo-500/30 bg-indigo-500/10 text-[10px]">Read Only</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1">
                            <span>Shared by <strong className="text-neutral-300">{batch.created_by}</strong></span>
                            <span>•</span>
                            <span>{images.length} variations</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={copyLink} className="h-8 text-xs border-neutral-700 hover:bg-neutral-800">
                        <Copy className="w-3 h-3 mr-2" />
                        Copy Link
                    </Button>
                </div>
            </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Original Image Card */}
            <div className="md:col-span-1">
                 <div className="bg-neutral-900/30 border border-neutral-800 rounded-2xl p-4 sticky top-24">
                    <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <ImageIcon className="w-3 h-3" /> Original Source
                    </h3>
                    <div className="relative aspect-square rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950/50">
                        <Image 
                            src={batch.original_image_url} 
                            alt="Original" 
                            fill 
                            className="object-contain"
                            unoptimized
                        />
                    </div>
                 </div>
            </div>

            {/* Generated Grid */}
            <div className="md:col-span-3">
                <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-sm font-bold text-white">Generated Variations</h3>
                    <Badge variant="secondary" className="text-xs">{images.length}</Badge>
                </div>

                {images.length === 0 ? (
                    <div className="text-center py-20 bg-neutral-900/20 rounded-xl border border-neutral-800 border-dashed">
                        <Layers className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
                        <p className="text-neutral-500 text-sm">No public images available.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {images.map((img) => (
                            <div key={img.id} className="group relative bg-neutral-900/30 border border-neutral-800 rounded-2xl overflow-hidden hover:border-indigo-500/30 transition-all duration-300">
                                <div className="aspect-square relative flex items-center justify-center bg-black/20">
                                    <Image 
                                        src={img.url} 
                                        alt={img.edit_prompt} 
                                        fill 
                                        className="object-contain p-2"
                                        unoptimized
                                    />
                                    {img.is_public && (
                                        <Link href={`/image/${img.id}`} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-black/50 backdrop-blur text-white hover:bg-black/70 border border-white/10">
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                                <div className="p-3 border-t border-neutral-800 bg-neutral-900/50">
                                    <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed font-medium">
                                        {img.edit_prompt}
                                    </p>
                                </div>
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
                             Load More
                         </Button>
                     </div>
                 )}
            </div>
        </div>

      </main>
    </div>
  );
}
