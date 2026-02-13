"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ListOrdered,
  Loader2,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Layers,
  Wand2,
  Image as ImageIcon,
} from "lucide-react";

interface QueueJob {
  id: number;
  position: number | null;
  prompt: string;
  edit_prompt: string | null;
  is_edit: boolean;
  status: string;
  model: string;
  provider: string;
  category: string;
  width: number;
  height: number;
  user_id: number;
  batch_job_id: number | null;
  url: string | null;
  created_at: string;
  updated_at: string;
}

interface BatchInfo {
  id: number;
  name: string;
  status: string;
  total_images: number;
  generated_count: number;
  failed_count: number;
  user_id: number;
  created_at: string;
}

interface QueueStats {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
}

export default function QueueAdminPage() {
  const [stats, setStats] = useState<any>({});
  const [processing, setProcessing] = useState<QueueJob[]>([]);
  const [queuedData, setQueuedData] = useState<{ items: QueueJob[], total: number }>({ items: [], total: 0 });
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Pagination
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchQueue = useCallback(async () => {
    try {
      const skip = (page - 1) * limit;
      const res = await api.get("/admin/queue", {
        params: { skip, limit }
      });
      
      if (res.data.success) {
        setStats(res.data.data.stats);
        setProcessing(res.data.data.processing);
        setQueuedData(res.data.data.queued); // Now an object { items, total }
        setBatches(res.data.data.active_batches);
      }
    } catch (error) {
      console.error("Failed to fetch queue", error);
      toast.error("Failed to load queue data");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Auto-refresh every 5s
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchQueue]);

  const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) => (
    <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-xl p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-neutral-100">{value?.toLocaleString() || 0}</p>
        <p className="text-xs text-neutral-500 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );

  const totalPages = Math.ceil(queuedData.total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            Queue Monitor
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Global view of all generation jobs and their positions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              autoRefresh
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-neutral-800 text-neutral-400 border-neutral-700"
            }`}
          >
            {autoRefresh ? "⚡ Live" : "⏸ Paused"}
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setLoading(true); fetchQueue(); }}
            className="border-neutral-700 text-neutral-400"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats Grid - Keys matched to Backend */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Queued" value={stats.queued} icon={Clock} color="bg-amber-500/10 text-amber-400" />
        <StatCard label="Processing" value={stats.processing} icon={Zap} color="bg-indigo-500/10 text-indigo-400" />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} color="bg-emerald-500/10 text-emerald-400" />
        <StatCard label="Failed" value={stats.failed} icon={XCircle} color="bg-red-500/10 text-red-400" />
      </div>

      {/* Currently Processing */}
      <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center gap-3">
          <Zap className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-neutral-200">Currently Processing</h2>
          <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
            {processing.length}
          </Badge>
        </div>
        <div className="divide-y divide-neutral-800">
          {processing.length === 0 ? (
            <div className="p-8 text-center text-neutral-600">
              <Loader2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No jobs currently processing</p>
            </div>
          ) : (
            processing.map((job) => (
              <JobRow key={job.id} job={job} />
            ))
          )}
        </div>
      </div>

      {/* Queue */}
      <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ListOrdered className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-neutral-200">Queue</h2>
            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
              {queuedData.total} jobs
            </Badge>
          </div>
          
          {/* Pagination Controls */}
          <div className="flex items-center gap-2">
            <Button 
                variant="outline" 
                size="sm" 
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="h-8 border-neutral-700 text-neutral-400"
            >
                Previous
            </Button>
            <span className="text-xs text-neutral-500">
                Page {page} of {Math.max(1, totalPages)}
            </span>
            <Button 
                variant="outline" 
                size="sm" 
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="h-8 border-neutral-700 text-neutral-400"
            >
                Next
            </Button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900/80 border-b border-neutral-800 text-neutral-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 w-16">#</th>
                <th className="px-5 py-3 w-12">ID</th>
                <th className="px-5 py-3">Prompt</th>
                <th className="px-5 py-3 w-24">Type</th>
                <th className="px-5 py-3 w-20">Model</th>
                <th className="px-5 py-3 w-24">Size</th>
                <th className="px-5 py-3 w-16">User</th>
                <th className="px-5 py-3 w-16">Batch</th>
                <th className="px-5 py-3 w-32">Queued At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50">
              {loading && queuedData.items.length === 0 ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={9} className="p-4">
                      <div className="h-5 bg-neutral-800/50 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : queuedData.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-neutral-600">
                    Queue is empty — all caught up! 🎉
                  </td>
                </tr>
              ) : (
                queuedData.items.map((job) => (
                  <tr key={job.id} className="hover:bg-neutral-800/20 transition-colors">
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 font-bold text-sm">
                        {job.position}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-neutral-400 text-xs">#{job.id}</td>
                    <td className="px-5 py-3 text-neutral-300 max-w-xs truncate">
                      {job.is_edit ? (job.edit_prompt || job.prompt) : job.prompt}
                    </td>
                    <td className="px-5 py-3">
                      {job.is_edit ? (
                        <Badge className="bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20 text-[10px]">
                          <Wand2 className="w-3 h-3 mr-1" />Edit
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">
                          <ImageIcon className="w-3 h-3 mr-1" />Gen
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-neutral-500 text-xs">{job.model}</td>
                    <td className="px-5 py-3 text-neutral-500 text-xs">{job.width}×{job.height}</td>
                    <td className="px-5 py-3">
                      <span className="bg-neutral-800 px-1.5 py-0.5 rounded text-xs text-neutral-400">#{job.user_id}</span>
                    </td>
                    <td className="px-5 py-3 text-neutral-500 text-xs">
                      {job.batch_job_id ? (
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3 text-cyan-500" />
                          #{job.batch_job_id}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-3 text-neutral-500 text-xs">
                      {job.created_at ? format(new Date(job.created_at), "MMM d, HH:mm:ss") : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Batches */}
      {batches.length > 0 && (
        <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-800 flex items-center gap-3">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-neutral-200">Active Batches</h2>
            <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
              {batches.length}
            </Badge>
          </div>
          <div className="divide-y divide-neutral-800">
            {batches.map((batch) => (
              <div key={batch.id} className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-neutral-200 font-medium">{batch.name}</p>
                  <p className="text-xs text-neutral-500">
                    Batch #{batch.id} · User #{batch.user_id} · {format(new Date(batch.created_at), "MMM d, HH:mm")}
                  </p>
                </div>
                <Badge className={`text-xs ${
                  batch.status === "generating"
                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}>
                  {batch.status}
                </Badge>
                <div className="text-right">
                  <p className="text-sm text-neutral-300 font-mono">
                    {batch.generated_count} / {batch.total_images}
                  </p>
                  {batch.failed_count > 0 && (
                    <p className="text-[10px] text-red-400">{batch.failed_count} failed</p>
                  )}
                </div>
                {/* Progress bar */}
                <div className="w-32 h-2 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                    style={{ width: `${(batch.generated_count / batch.total_images) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function JobRow({ job }: { job: QueueJob }) {
  return (
    <div className="px-5 py-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center animate-pulse">
        <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-neutral-200 text-sm truncate">
          {job.is_edit ? (job.edit_prompt || job.prompt) : job.prompt}
        </p>
        <p className="text-xs text-neutral-500">
          Job #{job.id} · {job.model} · {job.width}×{job.height} · User #{job.user_id}
        </p>
      </div>
      {job.is_edit && (
        <Badge className="bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20 text-[10px]">
          <Wand2 className="w-3 h-3 mr-1" />Edit
        </Badge>
      )}
      {job.batch_job_id && (
        <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px]">
          <Layers className="w-3 h-3 mr-1" />Batch #{job.batch_job_id}
        </Badge>
      )}
      <p className="text-xs text-neutral-600 whitespace-nowrap">
        {job.updated_at ? format(new Date(job.updated_at), "HH:mm:ss") : ""}
      </p>
    </div>
  );
}
