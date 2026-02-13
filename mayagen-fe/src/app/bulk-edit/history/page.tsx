'use client';

import { useState, useEffect } from 'react';
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, Wand2, CheckCircle, Clock, AlertCircle, ArrowLeft, RefreshCw, Trash2, ChevronRight, Image as ImageIcon, Sparkles, FolderOpen, MousePointer2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { toast } from "sonner";

interface EditBatchJob {
  id: number;
  name: string;
  category: string;
  status: string;
  total_variations: number;
  generated_count: number;
  failed_count: number;
  progress: number;
  created_at: string;
  original_image_url: string;
}

export default function BulkEditHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [batches, setBatches] = useState<EditBatchJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    if (user) fetchBatches();
  }, [user]);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await api.get('/edit-batch');
      if (res.data.success) {
        setBatches(res.data.data.batches);
      }
    } catch (e) {
      console.error('Failed to fetch edit batches', e);
    } finally {
      setLoading(false);
    }
  };

  const confirmCancel = async () => {
    if (!cancelId) return;
    try {
      await api.delete(`/edit-batch/${cancelId}`);
      toast.success('Batch cancelled');
      fetchBatches();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to cancel');
    } finally {
      setCancelId(null);
    }
  };

  const promptCancel = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCancelId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/edit-batch/${deleteId}?force=true`);
      toast.success('Batch and files deleted');
      fetchBatches();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleteId(null);
    }
  };

  const promptDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteId(id);
  };

  const getStatusBadgeStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'completed') return 'bg-green-500/10 text-green-400 border-green-500/20';
    if (s === 'generating' || s === 'processing') return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    if (s === 'queued') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (s === 'failed') return 'bg-red-500/10 text-red-400 border-red-500/20';
    return 'bg-neutral-800 text-neutral-400 border-neutral-700';
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'completed') return 'bg-green-500';
    if (s === 'generating' || s === 'processing') return 'bg-indigo-500';
    if (s === 'queued') return 'bg-amber-500';
    if (s === 'failed') return 'bg-red-500';
    return 'bg-neutral-600';
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-[#050505]"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  if (!user) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] gap-4">
      <Wand2 className="w-12 h-12 text-neutral-800" />
      <h1 className="text-xl font-bold text-white">Login Required</h1>
      <Link href="/login"><Button className="bg-indigo-600">Sign In</Button></Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-200 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-black/40 border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/bulk-edit" className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] transition-all">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-bold text-white">Edit History</h1>
              <Badge variant="outline" className="border-white/10 text-neutral-500">{batches.length} projects</Badge>
            </div>
            
            <Button variant="outline" size="sm" onClick={fetchBatches} className="border-white/10 text-white hover:bg-white/5 h-10 px-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* List */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 rounded-3xl bg-white/[0.02] animate-pulse border border-white/[0.05]" />
            ))}
          </div>
        ) : batches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-6">
              <Wand2 className="w-10 h-10 text-neutral-800" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No edit projects yet</h2>
            <p className="text-neutral-500 mb-8 max-w-sm">Start your first bulk edit project to see it appearing here.</p>
            <Link href="/bulk-edit">
              <Button className="bg-indigo-600 hover:bg-indigo-500 rounded-full h-12 px-8 font-bold shadow-lg shadow-indigo-600/20">
                <Sparkles className="w-4 h-4 mr-2" />
                Start Bulk Editing
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {batches.map((batch, index) => (
              <Link
                key={batch.id}
                href={`/bulk-edit/view/${batch.id}`}
                className="group block bg-white/[0.02] border border-white/[0.05] rounded-[2rem] overflow-hidden hover:border-indigo-500/30 transition-all duration-300 relative animate-in fade-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Progress Bar Top */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-white/5">
                  <div
                    className={`h-full transition-all duration-1000 ${getStatusColor(batch.status)}`}
                    style={{ width: `${batch.progress}%` }}
                  />
                </div>

                <div className="p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 shrink-0 bg-neutral-900 p-1 flex items-center justify-center">
                       {batch.original_image_url ? (
                         <img 
                           src={batch.original_image_url} 
                           alt={batch.name}
                           className="w-full h-full object-contain"
                           onError={(e) => {
                             e.currentTarget.style.display = 'none';
                             e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                           }}
                         />
                       ) : null}
                       <div className={`fallback-icon ${batch.original_image_url ? 'hidden' : ''} flex items-center justify-center w-full h-full text-neutral-600`}>
                          <ImageIcon className="w-6 h-6" />
                       </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-lg group-hover:text-indigo-400 transition-colors truncate">{batch.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-[10px] h-4 leading-none font-bold uppercase ${getStatusBadgeStyle(batch.status)}`}>
                          {batch.status}
                        </Badge>
                        <span className="text-[10px] text-neutral-600 uppercase font-bold tracking-widest">{new Date(batch.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs">
                       <div className="flex items-center gap-2 text-neutral-500">
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span className="uppercase tracking-widest font-bold text-[10px]">{batch.category}</span>
                       </div>
                       <span className="text-indigo-400 font-bold">{batch.generated_count} / {batch.total_variations} variations</span>
                    </div>

                    <div className="h-1.5 bg-black/40 rounded-full border border-white/5 overflow-hidden">
                       <div className={`h-full bg-indigo-500 transition-all duration-1000`} style={{ width: `${batch.progress}%` }} />
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-5 border-t border-white/[0.05] flex items-center justify-between">
                     <span className="text-[10px] font-bold text-neutral-600 italic">ID: #{batch.id}</span>
                     
                     <div className="flex items-center gap-2">
                        {(batch.status === 'queued' || batch.status === 'generating' || batch.status === 'processing') && (
                          <button
                            onClick={(e) => promptCancel(batch.id, e)}
                            className="p-2 rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Cancel Processing"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {['completed', 'failed', 'cancelled'].includes(batch.status.toLowerCase()) && (
                          <button
                            onClick={(e) => promptDelete(batch.id, e)}
                            className="p-2 rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Delete Project (Permanent)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <div className="p-2 rounded-lg bg-white/[0.03] text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                           <ChevronRight className="w-4 h-4" />
                        </div>
                     </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Cancel Confirmation */}
      {cancelId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Cancel Project?</h3>
              <p className="text-neutral-500 mb-8 text-sm leading-relaxed">
                This will stop all remaining generations. This action cannot be undone.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => setCancelId(null)} variant="outline" className="h-12 rounded-2xl border-white/10 hover:bg-white/5">
                Keep
              </Button>
              <Button onClick={confirmCancel} className="h-12 rounded-2xl bg-red-600 hover:bg-red-700 font-bold">
                Yes, Stop
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Delete Project?</h3>
              <p className="text-neutral-500 mb-8 text-sm leading-relaxed">
                Are you sure you want to permanently delete this project and all its variations?
                <br/><span className="text-red-400 font-bold">This cannot be undone.</span>
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => setDeleteId(null)} variant="outline" className="h-12 rounded-2xl border-white/10 hover:bg-white/5">
                Cancel
              </Button>
              <Button onClick={confirmDelete} className="h-12 rounded-2xl bg-red-600 hover:bg-red-700 font-bold">
                Yes, Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
