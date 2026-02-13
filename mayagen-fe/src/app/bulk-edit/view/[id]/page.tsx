'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, ArrowLeft, RefreshCw, Image as ImageIcon, 
  CheckCircle, Clock, AlertCircle, Layers, Cpu, 
  Calendar, FolderOpen, Maximize, Download, ExternalLink,
  Wand2, Trash2, Share2, Copy
} from "lucide-react";
import Link from 'next/link';
import { toast } from "sonner";
import { PaginationControl } from "@/components/ui/pagination-control";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface EditBatchJob {
  id: number;
  name: string;
  category: string;
  original_image_id: number;
  original_image_url: string;
  status: string;
  total_variations: number;
  generated_count: number;
  failed_count: number;
  progress: number;
  model: string;
  provider: string;
  width: number;
  height: number;
  created_at: string;
  share_token?: string | null;
}

interface BatchImage {
  id: number;
  url: string | null;
  filename: string;
  category: string;
  prompt: string;
  edit_prompt: string;
  model: string;
  status: string;
  created_at: string;
}

export default function BulkEditViewPage() {
  const params = useParams();
  const batchId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  
  const [batch, setBatch] = useState<EditBatchJob | null>(null);
  const [images, setImages] = useState<BatchImage[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Share State
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 20;

  useEffect(() => {
    if (user && batchId) {
      fetchBatchData(page);
      
      // Setup polling if not completed
      const interval = setInterval(() => {
        if (batch && (batch.status === 'QUEUED' || batch.status === 'GENERATING' || batch.status === 'PROCESSING')) {
          fetchBatchData(page, false);
        }
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [user, batchId, page, batch?.status]);

  const fetchBatchData = async (pageNum: number = 1, showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [batchRes, imagesRes] = await Promise.all([
        api.get(`/edit-batch/${batchId}`),
        api.get(`/edit-batch/${batchId}/images?page=${pageNum}&limit=${LIMIT}`)
      ]);

      if (batchRes.data.success) {
        setBatch(batchRes.data.data);
      }

      if (imagesRes.data.success) {
        setImages(imagesRes.data.data.images);
        if (imagesRes.data.data.meta) {
          setTotalPages(imagesRes.data.data.meta.total_pages);
        }
      }
    } catch (e: any) {
      console.error('Failed to fetch batch data', e);
      if (showLoading) toast.error('Failed to load edit batch');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const cancelBatch = async () => {
    if (!confirm("Are you sure you want to cancel this batch?")) return;
    try {
      const res = await api.delete(`/edit-batch/${batchId}`);
      if (res.data.success) {
        toast.success("Batch cancelled");
        fetchBatchData(page);
      }
    } catch (e: any) {
      toast.error("Failed to cancel: " + (e.response?.data?.message || e.message));
    }
  };

  const handleExport = async () => {
      try {
          const downloadUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/edit-batch/${batchId}/download`;
          
          toast.info("Preparing export... This may take a moment.");
          const res = await api.get(`/edit-batch/${batchId}/download`, { responseType: 'blob' });
          
          const url = window.URL.createObjectURL(new Blob([res.data]));
          const link = document.createElement('a');
          link.href = url;
          
          const contentDisposition = res.headers['content-disposition'];
          let filename = `edit_batch_${batchId}.zip`;
          if (contentDisposition) {
              const match = contentDisposition.match(/filename=(.+)/);
              if (match && match[1]) filename = match[1];
          }
          
          link.setAttribute('download', filename);
          document.body.appendChild(link);
          link.click();
          link.remove();
          toast.success("Export started");
      } catch (e) {
          console.error("Export failed", e);
          toast.error("Failed to export batch");
      }
  };
  
  const handleShare = async () => {
      if (batch?.share_token) {
          setShareDialogOpen(true);
          return;
      }
      
      setShareLoading(true);
      try {
          const res = await api.post(`/edit-batch/${batchId}/share`);
          if (res.data.success) {
              setBatch(prev => prev ? { ...prev, share_token: res.data.data.share_token } : null);
              setShareDialogOpen(true);
              toast.success("Share link created");
          }
      } catch (e) {
          toast.error("Failed to generate share link");
      } finally {
          setShareLoading(false);
      }
  };

  const copyShareLink = () => {
      if (!batch?.share_token) return;
      const url = `${window.location.origin}/share-edit/${batch.share_token}`;
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
  };

  const revokeShareLink = async () => {
      if (!confirm("Are you sure? This will disable the current link.")) return;
      try {
          await api.delete(`/edit-batch/${batchId}/share`);
          setBatch(prev => prev ? { ...prev, share_token: null } : null);
          setShareDialogOpen(false);
          toast.success("Link revoked");
      } catch (e) {
          toast.error("Failed to revoke link");
      }
  };

  const getStatusIcon = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'completed') return <CheckCircle className="w-5 h-5 text-green-400" />;
    if (s === 'generating' || s === 'processing') return <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />;
    if (s === 'queued') return <Clock className="w-5 h-5 text-amber-400" />;
    if (s === 'failed') return <AlertCircle className="w-5 h-5 text-red-400" />;
    return <Clock className="w-5 h-5 text-neutral-400" />;
  };

  if (authLoading || (loading && !batch)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        <p className="text-neutral-500 font-medium">Loading edit results...</p>
      </div>
    );
  }

  if (!user || !batch) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] gap-4">
        <ImageIcon className="w-12 h-12 text-neutral-800" />
        <h1 className="text-xl font-bold text-white">Not Found</h1>
        <Link href="/bulk-edit/history"><Button variant="outline">Back to History</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-200 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-black/40 border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <Link href="/bulk-edit/history" className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] transition-all">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex-1 md:flex-none">
                <div className="flex items-center gap-3">
                  {getStatusIcon(batch.status)}
                  <h1 className="text-xl font-bold text-white line-clamp-1">{batch.name}</h1>
                  <Badge className={`capitalize font-bold ${
                    batch.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                    batch.status === 'generating' || batch.status === 'processing' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 animate-pulse' :
                    batch.status === 'failed' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                    'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  }`}>
                    {batch.status ? batch.status : 'UNKNOWN'}
                   </Badge>
                </div>
                <p className="text-xs text-neutral-500 mt-1 uppercase tracking-tight font-medium">Bulk Edit Project</p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <Button variant="outline" size="sm" onClick={() => fetchBatchData(page)} className="border-white/10 text-neutral-200 hover:bg-white/5 h-10 px-4">
                <RefreshCw className="w-4 h-4" />
              </Button>
              
              <Button 
                variant="outline"
                size="sm" 
                onClick={handleShare}
                disabled={shareLoading}
                className="border-white/10 text-neutral-200 hover:bg-white/5 h-10 px-4"
              >
                  {shareLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4 mr-2" />}
                  Share
              </Button>

              {batch.status === 'generating' && (
                <Button variant="ghost" size="sm" onClick={cancelBatch} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-10 px-4">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              )}
              
              <Button 
                size="sm" 
                onClick={handleExport}
                className="bg-indigo-600 hover:bg-indigo-500 h-10 px-6 font-bold shadow-lg shadow-indigo-600/20"
              >
                <Download className="w-4 h-4 mr-2" />
                Export ZIP
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        
        {/* Progress Bar */}
        <div className="mb-10 bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000" style={{ width: `${batch.progress}%` }} />
          
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-neutral-400 uppercase tracking-widest">{batch.progress}% Processed</span>
            <span className="text-sm font-mono text-indigo-400">{batch.generated_count} / {batch.total_variations} variations complete</span>
          </div>
          <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/5">
            <div className={`h-full rounded-full transition-all duration-1000 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]`} style={{ width: `${batch.progress}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Original Image Info */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-32">
             <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 shadow-2xl">
                <h2 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <ImageIcon className="w-3 h-3" />
                  Original Input
                </h2>
                
                <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 group mb-4">
                  <Image 
                    src={batch.original_image_url} 
                    alt="Original" 
                    fill 
                    className="object-contain bg-black/40 p-2"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Link href={`/image/${batch.original_image_id}`}>
                      <Button variant="outline" size="sm" className="rounded-full bg-black/60 backdrop-blur-md border-white/20 text-white">
                        <ExternalLink className="w-3 h-3 mr-2" />
                        View Full Image
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="space-y-4">
                  <DetailRow icon={<FolderOpen className="w-3.5 h-3.5" />} label="Category" value={batch.category} />
                  <DetailRow icon={<Cpu className="w-3.5 h-3.5" />} label="Model" value={batch.model} />
                  <DetailRow icon={<Maximize className="w-3.5 h-3.5" />} label="Resolution" value={`${batch.width}x${batch.height}`} />
                  <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="Started" value={new Date(batch.created_at).toLocaleDateString()} />
                </div>
             </div>

             <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10">
                <p className="text-xs text-indigo-200/60 leading-relaxed italic">
                  This bulk edit uses the **FLUX Image Edit** engine. Each variation is generated independently using your original image as the reference.
                </p>
             </div>
          </div>

          {/* Right: Variations Grid */}
          <div className="lg:col-span-8 space-y-6">
             <div className="flex items-center justify-between px-2">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <Wand2 className="w-5 h-5 text-indigo-400" />
                  Generated Variations
                </h2>
                <Badge variant="outline" className="text-neutral-500 border-white/5">{images.length} visible</Badge>
             </div>

             {images.length === 0 ? (
               <div className="h-[400px] rounded-3xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center p-8 bg-white/[0.01]">
                  <Loader2 className="w-10 h-10 text-indigo-500/50 animate-spin mb-4" />
                  <h3 className="text-lg font-medium text-neutral-400">Generations in Progress</h3>
                  <p className="text-sm text-neutral-600 max-w-xs mt-2">The AI is currently processing your edits. They will appear here one by one as they complete.</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {images.map((img, idx) => (
                    <VariationCard key={img.id} image={img} index={idx} />
                  ))}
               </div>
             )}

             {/* Pagination */}
             {totalPages > 1 && (
               <div className="pt-8">
                  <PaginationControl
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
               </div>
             )}
          </div>

        </div>
      </main>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-md bg-neutral-900 border-neutral-800 text-white">
          <DialogHeader>
            <DialogTitle>Share Edit Batch</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Anyone with this link can view the original image and generated variations.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <Input
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/share-edit/${batch?.share_token || ''}`}
                className="bg-neutral-950 border-neutral-800 text-neutral-300"
              />
            </div>
            <Button size="sm" size="icon" onClick={copyShareLink} className="bg-indigo-600 hover:bg-indigo-500">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex justify-start mt-2">
              <Button variant="ghost" size="sm" onClick={revokeShareLink} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-2">
                  Revoke Link
              </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-2 text-neutral-500 uppercase tracking-tighter font-bold">
        {icon}
        {label}
      </div>
      <span className="text-neutral-300 font-medium truncate max-w-[150px]">{value}</span>
    </div>
  );
}

function VariationCard({ image, index }: { image: BatchImage, index: number }) {
  const isCompleted = image.status.toUpperCase() === 'COMPLETED';
  const isProcessing = ['PENDING', 'PROCESSING', 'QUEUED'].includes(image.status.toUpperCase());
  const isFailed = image.status.toUpperCase() === 'FAILED';

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden group hover:border-indigo-500/30 transition-all duration-300 shadow-xl flex flex-col h-full animate-in zoom-in-95 fade-in duration-500" style={{ animationDelay: `${index * 50}ms` }}>
      
      {/* Image Part */}
      <div className="aspect-square relative flex items-center justify-center bg-black/40 overflow-hidden">
        {isCompleted && image.url ? (
          <Image 
            src={image.url} 
            alt={image.prompt || "Variation"} 
            fill 
            className="object-contain p-1 group-hover:scale-105 transition-transform duration-500"
            unoptimized
          />
        ) : isProcessing ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-indigo-500 tracking-widest uppercase">
                AI
              </div>
            </div>
            <p className="text-xs text-neutral-500 animate-pulse font-medium">Processing Edit...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 opacity-40">
            <AlertCircle className="w-12 h-12 text-red-400" />
            <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Generation Failed</p>
          </div>
        )}

        {isCompleted && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
             <Link href={`/image/${image.id}`}>
               <Button size="sm" variant="outline" className="rounded-full bg-white/10 backdrop-blur-md border-white/20 text-white h-9">
                 <Maximize className="w-3.5 h-3.5 mr-2" />
                 Expand
               </Button>
             </Link>
             <a href={image.url || '#'} download target="_blank">
               <Button size="sm" className="rounded-full h-9 bg-indigo-600">
                 <Download className="w-3.5 h-3.5 mr-2" />
                 Save
               </Button>
             </a>
          </div>
        )}
      </div>

      {/* Info Part */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
           <div className="flex items-center justify-between mb-3 text-[10px] uppercase font-bold tracking-widest">
              <span className="text-neutral-600">Prompt</span>
              <Badge variant="outline" className={`text-[9px] h-4 leading-none font-bold ${
                isCompleted ? 'text-green-500 border-green-500/20' :
                isProcessing ? 'text-indigo-400 border-indigo-500/20 animate-pulse' :
                'text-red-400 border-red-500/20'
              }`}>
                {image.status}
              </Badge>
           </div>
           <p className="text-sm text-neutral-300 line-clamp-2 leading-relaxed font-medium">
             {image.edit_prompt || image.prompt}
           </p>
        </div>
        
        {isCompleted && (
          <div className="pt-4 flex items-center justify-between text-[10px] text-neutral-600 mt-2 border-t border-white/5">
             <span>{new Date(image.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
             <span className="font-mono">{image.model}</span>
          </div>
        )}
      </div>
    </div>
  );
}
