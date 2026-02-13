
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { PaginationControl } from "@/components/ui/pagination-control";
import { Activity, Clock, MapPin, Monitor, Zap } from "lucide-react";

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
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 20;

  const fetchLogs = async (page: number) => {
    setLoading(true);
    try {
      const skip = (page - 1) * LIMIT;
      const res = await api.get(`/admin/activity?skip=${skip}&limit=${LIMIT}`);
      
      if (res.data.success) {
         // Backend returns { items: [...], total: N }
        setLogs(res.data.data.items);
        setTotalPages(Math.ceil(res.data.data.total / LIMIT));
      }
    } catch (error) {
      console.error("Failed to fetch logs", error);
      toast.error("Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(currentPage);
  }, [currentPage]);

  const getActionColor = (action: string) => {
     if (action === "LOGIN") return "bg-green-500/10 text-green-400 border-green-500/20";
     if (action.includes("FAIL")) return "bg-red-500/10 text-red-400 border-red-500/20";
     return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            User Activity
          </h1>
          <p className="text-neutral-500 text-sm mt-1">Audit trail of user actions and security events</p>
        </div>
      </div>

      <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-neutral-900/80 border-b border-neutral-800 text-neutral-400 font-medium">
              <tr>
                <th className="p-4 w-40">Time</th>
                <th className="p-4 w-20">User</th>
                <th className="p-4 w-32">Action</th>
                <th className="p-4">Endpoint</th>
                <th className="p-4">Location</th>
                <th className="p-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
               {loading ? (
                // Skeleton Loading
                [...Array(10)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                     <td colSpan={6} className="p-4">
                        <div className="h-6 bg-neutral-800/50 rounded w-full"></div>
                     </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                 <tr>
                    <td colSpan={6} className="p-8 text-center text-neutral-500">
                      No activity logs found.
                    </td>
                 </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-800/30 transition-colors group">
                    <td className="p-4 text-neutral-500 flex items-center gap-2">
                       <Clock className="w-3.5 h-3.5 opacity-50" />
                      {format(new Date(log.timestamp.endsWith("Z") ? log.timestamp : log.timestamp + "Z"), "MMM d, HH:mm:ss")}
                    </td>
                    <td className="p-4 font-mono text-neutral-300">
                       <span className="bg-neutral-800 px-1.5 py-0.5 rounded text-xs">#{log.user_id}</span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-neutral-400 font-mono text-xs">
                       <div className="flex items-center gap-1.5">
                          <span className="text-neutral-600 font-bold">{log.method}</span>
                          <span className="group-hover:text-neutral-300 transition-colors">{log.endpoint}</span>
                       </div>
                    </td>
                    <td className="p-4 text-neutral-400">
                      <div className="flex items-center gap-2">
                         <div className="flex flex-col">
                            <span className="text-neutral-300 text-xs flex items-center gap-1">
                               <MapPin className="w-3 h-3 text-cyan-500/50" />
                               {log.location || "Unknown"}
                            </span>
                            <span className="text-[10px] text-neutral-600 pl-4">{log.ip_address}</span>
                         </div>
                      </div>
                    </td>
                    <td className="p-4 text-neutral-500 max-w-xs truncate text-xs font-mono">
                      {log.details ? JSON.stringify(log.details) : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
       {/* Pagination */}
      {!loading && (
        <PaginationControl
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          isLoading={loading}
        />
      )}
    </div>
  );
}
