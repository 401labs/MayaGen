
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

interface ActivityLog {
  id: number;
  user_id: number;
  action: string;
  method: string;
  endpoint: string;
  ip_address: string;
  location: string;
  user_agent: string;
  details: any;
  timestamp: string;
}

export default function ActivityAdminPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await api.get("/admin/activity");
      if (res.data.success) {
        setLogs(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch logs", error);
      toast.error("Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  if (loading) {
    return <div className="text-white text-center py-20">Loading activity...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          User Activity
        </h1>
        <span className="text-zinc-500">{logs.length} Events</span>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400">
              <tr>
                <th className="p-4">Time</th>
                <th className="p-4">User ID</th>
                <th className="p-4">Action</th>
                <th className="p-4">Endpoint</th>
                <th className="p-4">Location</th>
                <th className="p-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-900/30 transition-colors">
                  <td className="p-4 text-zinc-500">
                    {format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss")}
                  </td>
                  <td className="p-4 font-mono text-zinc-400">#{log.user_id}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                      log.action === "LOGIN" 
                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-zinc-400 font-mono text-xs">
                    <span className="text-zinc-500 mr-2">{log.method}</span>
                    {log.endpoint}
                  </td>
                  <td className="p-4 text-zinc-400">
                    <div className="flex flex-col">
                      <span>{log.location || "Unknown"}</span>
                      <span className="text-xs text-zinc-600">{log.ip_address}</span>
                    </div>
                  </td>
                  <td className="p-4 text-zinc-500 max-w-xs truncate" title={JSON.stringify(log.details)}>
                    {log.details ? JSON.stringify(log.details) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
