'use client';

import { useState, useEffect } from 'react';
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ShareBatchDialog } from "@/components/bulk/ShareBatchDialog";
import { Loader2, Layers, CheckCircle, Clock, AlertCircle, ArrowLeft, RefreshCw, Trash2, ChevronRight, Image as ImageIcon, Sparkles, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  created_at: string;
  share_token?: string | null;
}

export default function BatchHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [batches, setBatches] = useState<BatchJob[]>([]);
  const [loading, setLoading] = useState(true);

  // Share Dialog State
  const [shareDialog, setShareDialog] = useState<{isOpen: boolean; batchId: number; batchName: string; token?: string | null}>({
    isOpen: false,
    batchId: 0,
    batchName: '',
    token: null
  });

  useEffect(() => {
    if (user) fetchBatches();
  }, [user]);

  const [cancelId, setCancelId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await api.get('/batch');
      if (res.data.success) setBatches(res.data.data.batches);
    } catch (e) {
      console.error('Failed to fetch batches', e);
    } finally {
      setLoading(false);
    }
  };

  const openShareDialog = (e: React.MouseEvent, batch: BatchJob) => {
    e.preventDefault();
    e.stopPropagation();
    setShareDialog({
      isOpen: true,
      batchId: batch.id,
      batchName: batch.name,
      token: batch.share_token
    });
  };

  const handleShareUpdate = (token: string | null) => {
    // Update local state without refetching
    setBatches(prev => prev.map(b => 
      b.id === shareDialog.batchId ? { ...b, share_token: token } : b
    ));
    // Update dialog state too just in case
    setShareDialog(prev => ({ ...prev, token }));
  };

  const confirmCancel = async () => {
    if (!cancelId) return;
    try {
      await api.delete(`/batch/${cancelId}`);
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
      await api.delete(`/batch/${deleteId}?force=true`);
      toast.success('Batch and images deleted');
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'generating': return <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />;
      case 'queued': return <Clock className="w-5 h-5 text-amber-500" />;
      case 'failed': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-neutral-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'generating': return 'bg-indigo-500';
      case 'queued': return 'bg-amber-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-neutral-600';
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'generating': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'queued': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'failed': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-neutral-800 text-neutral-400 border-neutral-700';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 gap-4">
        <div className="p-4 rounded-full bg-neutral-900 border border-neutral-800">
          <Layers className="w-12 h-12 text-neutral-500" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold text-white">Login Required</h1>
          <p className="text-neutral-500 text-sm mt-1">Please sign in to view your batch history</p>
        </div>
        <Link href="/login">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white h-10 px-8">
            Sign In
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-neutral-950/80 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/bulk" className="p-2 -ml-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-bold">Batch History</h1>
              <Badge variant="secondary" className="bg-neutral-800 text-neutral-300">
                {batches.length} batches
              </Badge>
            </div>
            
            <Button variant="outline" size="sm" onClick={fetchBatches} className="border-neutral-800 hover:bg-neutral-800 text-neutral-400">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Batch List */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 rounded-xl bg-neutral-900 animate-pulse border border-neutral-800" />
            ))}
          </div>
        ) : batches.length === 0 ? (
          <div className="text-center py-20 text-neutral-500">
            <Layers className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <h2 className="text-lg font-medium text-neutral-300 mb-1">No batch jobs yet</h2>
            <p className="text-sm mb-6 max-w-sm mx-auto">Create your first batch to generate images in bulk with variations.</p>
            <Link href="/bulk">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Sparkles className="w-4 h-4 mr-2" />
                Create First Batch
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {batches.map((batch, index) => (
              <Link
                key={batch.id}
                href={`/bulk/view/${batch.id}`}
                className="group block p-5 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-indigo-500/50 transition-all duration-300 relative overflow-hidden"
              >
                {/* Status Bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-neutral-800">
                  <div
                    className={`h-full transition-all duration-500 ${getStatusColor(batch.status)}`}
                    style={{ width: `${batch.progress}%` }}
                  />
                </div>

                <div className="mt-2 flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-white text-lg group-hover:text-indigo-400 transition-colors line-clamp-1">{batch.name}</h3>
                    <p className="text-neutral-400 text-xs mt-1">{new Date(batch.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge className={`capitalize border ${getStatusBadgeStyle(batch.status)}`}>
                    {batch.status}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">Progress</span>
                    <span className="text-neutral-300 font-medium">{batch.generated_count} / {batch.total_images}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                     <span className="px-2 py-1 rounded-md bg-neutral-800 text-xs text-neutral-400 font-medium line-clamp-1 flex-1">
                        {batch.category}
                     </span>
                     
                     {/* Share Button */}
                     <button
                        onClick={(e) => openShareDialog(e, batch)}
                        className={`p-1.5 rounded-md transition-all ${batch.share_token ? 'text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20' : 'text-neutral-500 hover:text-indigo-400 hover:bg-neutral-800'}`}
                        title="Share Batch"
                     >
                       <Share2 className="w-4 h-4" />
                     </button>

                     {(batch.status === 'queued' || batch.status === 'generating') && (
                       <button
                         onClick={(e) => promptCancel(batch.id, e)}
                         className="p-1.5 rounded-md text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-all group-hover:bg-neutral-800"
                         title="Cancel batch"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                     )}

                     {/* Delete Button for Terminal States */}
                     {['completed', 'failed', 'cancelled'].includes(batch.status) && (
                       <button
                         onClick={(e) => promptDelete(batch.id, e)}
                         className="p-1.5 rounded-md text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-all group-hover:bg-neutral-800"
                         title="Delete Batch (Permanent)"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                     )}
                  </div>
                </div>

                {batch.failed_count > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-red-400 bg-red-500/5 p-2 rounded border border-red-500/10">
                    <AlertCircle className="w-3 h-3" />
                    {batch.failed_count} generations failed
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Share Dialog */}
      <ShareBatchDialog 
        isOpen={shareDialog.isOpen}
        onClose={() => setShareDialog(prev => ({ ...prev, isOpen: false }))}
        batchId={shareDialog.batchId}
        batchName={shareDialog.batchName}
        initialShareToken={shareDialog.token}
        onUpdate={handleShareUpdate}
      />

      {/* Confirmation Modal */}
      {cancelId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-500/10 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-white">Cancel Batch?</h3>
            </div>
            
            <p className="text-neutral-400 mb-6 text-sm">
              Are you sure you want to cancel this batch? This will stop all pending generations. This action cannot be undone.
            </p>
            
            <div className="flex justify-end gap-3">
              <Button onClick={() => setCancelId(null)} className="bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700">
                Keep Processing
              </Button>
              <Button onClick={confirmCancel} className="bg-red-600 hover:bg-red-700 text-white border-red-600">
                Yes, Cancel Batch
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-500/10 rounded-full">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-white">Delete Batch?</h3>
            </div>
            
            <p className="text-neutral-400 mb-6 text-sm">
              Are you sure you want to permanently delete this batch and all its images? 
              <span className="block mt-2 text-red-400 font-medium">This action cannot be undone.</span>
            </p>
            
            <div className="flex justify-end gap-3">
              <Button onClick={() => setDeleteId(null)} className="bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700">
                Cancel
              </Button>
              <Button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white border-red-600">
                Yes, Delete Everything
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
