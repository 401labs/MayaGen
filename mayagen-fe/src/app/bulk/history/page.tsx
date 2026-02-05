'use client';

import { useState, useEffect } from 'react';
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, Layers, CheckCircle, Clock, AlertCircle, ArrowLeft, RefreshCw, Trash2 } from "lucide-react";
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

  const cancelBatch = async (id: number) => {
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
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'generating': return <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />;
      case 'queued': return <Clock className="w-4 h-4 text-amber-400" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-neutral-400" />;
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

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-neutral-950"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  if (!user) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 gap-3">
      <Layers className="w-12 h-12 text-neutral-700" />
      <h1 className="text-xl font-bold text-white">Login Required</h1>
      <Link href="/login"><Button className="bg-indigo-600 hover:bg-indigo-700">Login</Button></Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 pb-24">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/bulk" className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Batch History</h1>
              <p className="text-xs text-neutral-500">{batches.length} batch jobs</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchBatches} className="border-neutral-700">
            <RefreshCw className="w-3 h-3 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Batch List */}
      <div className="max-w-4xl mx-auto">
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-neutral-500" />
          </div>
        ) : batches.length === 0 ? (
          <div className="text-center py-12">
            <Layers className="w-12 h-12 mx-auto mb-3 text-neutral-700" />
            <p className="text-neutral-500">No batch jobs yet</p>
            <Link href="/bulk">
              <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700">Create First Batch</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {batches.map((batch) => (
              <div key={batch.id} className="p-4 bg-neutral-900/50 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(batch.status)}
                      <h3 className="font-medium">{batch.name}</h3>
                      <Badge variant="outline" className="text-xs border-neutral-700 capitalize">{batch.status}</Badge>
                    </div>
                    <p className="text-sm text-neutral-400">{batch.target_subject}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
                      <span>{batch.category}</span>
                      <span>•</span>
                      <span>{new Date(batch.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-medium">{batch.generated_count}/{batch.total_images}</div>
                    <div className="text-xs text-neutral-500">{batch.progress}%</div>
                    {(batch.status === 'queued' || batch.status === 'generating') && (
                      <button 
                        onClick={() => cancelBatch(batch.id)} 
                        className="mt-2 text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Cancel
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-3 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${getStatusColor(batch.status)}`} 
                    style={{ width: `${batch.progress}%` }} 
                  />
                </div>
                
                {batch.failed_count > 0 && (
                  <p className="mt-2 text-xs text-red-400">{batch.failed_count} failed</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
