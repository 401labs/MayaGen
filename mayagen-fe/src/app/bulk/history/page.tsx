'use client';

import { useState, useEffect } from 'react';
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, Layers, CheckCircle, Clock, AlertCircle, ArrowLeft, RefreshCw, Trash2, ChevronRight, Image as ImageIcon, Sparkles } from "lucide-react";
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
}

export default function BatchHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [batches, setBatches] = useState<BatchJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchBatches();
  }, [user]);

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

  const cancelBatch = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.delete(`/batch/${id}`);
      toast.success('Batch cancelled');
      fetchBatches();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to cancel');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'generating': return <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />;
      case 'queued': return <Clock className="w-5 h-5 text-amber-400" />;
      case 'failed': return <AlertCircle className="w-5 h-5 text-red-400" />;
      default: return <Clock className="w-5 h-5 text-slate-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'generating': return 'bg-indigo-500';
      case 'queued': return 'bg-amber-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-slate-600';
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'generating': return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'queued': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'failed': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-slate-700/20 text-slate-400 border-slate-600/30';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 gap-4">
        <div className="relative">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-ping" />
        </div>
        <p className="text-slate-400 animate-pulse font-medium">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 gap-4">
        <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700">
          <Layers className="w-12 h-12 text-slate-500" />
        </div>
        <h1 className="text-2xl font-semibold text-white">Login Required</h1>
        <p className="text-slate-400">Please sign in to view your batch history</p>
        <Link href="/login">
          <Button className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/25">
            Sign In
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 pb-24">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/bulk"
              className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 transition-all hover:shadow-md"
            >
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-white">Batch History</h1>
              <p className="text-slate-400 mt-0.5">{batches.length} batch jobs</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={fetchBatches}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-600 transition-all rounded-xl"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Batch List */}
      <div className="max-w-4xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <p className="text-slate-400 font-medium">Loading batches...</p>
          </div>
        ) : batches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 mb-4">
              <Layers className="w-12 h-12 text-slate-500" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">No batch jobs yet</h2>
            <p className="text-slate-400 mb-6">Create your first batch to generate images in bulk</p>
            <Link href="/bulk">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/25">
                <Sparkles className="w-4 h-4 mr-2" />
                Create First Batch
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {batches.map((batch, index) => (
              <Link
                key={batch.id}
                href={`/bulk/view/${batch.id}`}
                className="block p-5 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-indigo-600 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 hover:-translate-y-0.5 group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(batch.status)}
                      <h3 className="font-semibold text-white text-lg">{batch.name}</h3>
                      <Badge className={`capitalize border ${getStatusBadgeStyle(batch.status)}`}>
                        {batch.status}
                      </Badge>
                      {batch.generated_count > 0 && (
                        <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          <ImageIcon className="w-3 h-3 mr-1" />
                          {batch.generated_count} images
                        </Badge>
                      )}
                    </div>
                    <p className="text-slate-300 mb-2 font-medium">{batch.target_subject}</p>
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-medium">{batch.category}</span>
                      <span>•</span>
                      <span>{new Date(batch.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-semibold text-white">{batch.generated_count}/{batch.total_images}</div>
                      <div className="text-sm text-slate-400">{batch.progress}% complete</div>
                    </div>
                    {(batch.status === 'queued' || batch.status === 'generating') && (
                      <button
                        onClick={(e) => cancelBatch(batch.id, e)}
                        className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                        title="Cancel batch"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getStatusColor(batch.status)}`}
                    style={{ width: `${batch.progress}%` }}
                  />
                </div>

                {batch.failed_count > 0 && (
                  <p className="mt-3 text-sm text-red-400 flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4" />
                    {batch.failed_count} failed
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
