
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { Shield, ShieldAlert, User, Search, Ban, ChevronDown, ChevronUp, Ban as BanIcon, CheckCircle } from "lucide-react";
import { PaginationControl } from "@/components/ui/pagination-control";
import { Input } from "@/components/ui/input";

interface UserData {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at: string;
}

interface UserIP {
  ip_address: string;
  last_seen: string;
  is_blocked: boolean;
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 10;

  // IP Management State
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [userIPs, setUserIPs] = useState<Record<number, UserIP[]>>({});
  const [loadingIPs, setLoadingIPs] = useState<number | null>(null);
  const [blockingIP, setBlockingIP] = useState<string | null>(null);

  const fetchUsers = async (page: number) => {
    setLoading(true);
    try {
      const skip = (page - 1) * LIMIT;
      const res = await api.get(`/admin/users?skip=${skip}&limit=${LIMIT}`);
      
      if (res.data.success) {
        // Backend returns { items: [...], total: N }
        setUsers(res.data.data.items);
        setTotalPages(Math.ceil(res.data.data.total / LIMIT));
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage]);

  const fetchUserIPs = async (userId: number) => {
    if (userIPs[userId]) {
      // Toggle collapse if already loaded
      setExpandedUserId(expandedUserId === userId ? null : userId);
      return;
    }

    setLoadingIPs(userId);
    setExpandedUserId(userId);
    
    try {
      const res = await api.get(`/admin/users/${userId}/ips`);
      
      if (res.data.success) {
        setUserIPs({ ...userIPs, [userId]: res.data.data.ips });
      }
    } catch (error) {
      console.error("Failed to fetch user IPs", error);
      toast.error("Failed to load user IPs");
    } finally {
      setLoadingIPs(null);
    }
  };

  const blockIP = async (ip: string, userId: number) => {
    const reason = prompt(`Enter reason for blocking IP ${ip}:`);
    if (!reason) return;

    setBlockingIP(ip);
    try {
      const res = await api.post("/admin/block-ip", {
        ip_address: ip,
        reason: reason
      });
      
      if (res.data.success) {
        toast.success(`IP ${ip} blocked successfully`);
        // Refresh IPs for this user
        const refreshRes = await api.get(`/admin/users/${userId}/ips`);
        if (refreshRes.data.success) {
          setUserIPs({ ...userIPs, [userId]: refreshRes.data.data.ips });
        }
      }
    } catch (error: any) {
      console.error("Failed to block IP", error);
      const errorMsg = error.response?.data?.message || "Failed to block IP";
      toast.error(errorMsg);
    } finally {
      setBlockingIP(null);
    }
  };

  const unblockIP = async (ip: string, userId: number) => {
    if (!confirm(`Unblock IP ${ip}?`)) return;

    setBlockingIP(ip);
    try {
      const res = await api.delete(`/admin/block-ip/${encodeURIComponent(ip)}`);
      
      if (res.data.success) {
        toast.success(`IP ${ip} unblocked successfully`);
        // Refresh IPs for this user
        const refreshRes = await api.get(`/admin/users/${userId}/ips`);
        if (refreshRes.data.success) {
          setUserIPs({ ...userIPs, [userId]: refreshRes.data.data.ips });
        }
      }
    } catch (error: any) {
      console.error("Failed to unblock IP", error);
      const errorMsg = error.response?.data?.message || "Failed to unblock IP";
      toast.error(errorMsg);
    } finally {
      setBlockingIP(null);
    }
  };

  const toggleRole = async (user: UserData) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    if (!confirm(`Are you sure you want to change ${user.username}'s role to ${newRole}?`)) return;

    try {
      const res = await api.patch(`/admin/users/${user.id}/role`, null, {
        params: { role: newRole }
      });
      
      if (res.data.success) {
        toast.success(`User role updated to ${newRole}`);
        fetchUsers(currentPage);
      }
    } catch (error) {
      console.error("Failed to update role", error);
      toast.error("Failed to update role");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-neutral-500 bg-clip-text text-transparent">
            User Management
          </h1>
          <p className="text-neutral-500 text-sm mt-1">Manage user roles and permissions</p>
        </div>
      </div>

      <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900/80 border-b border-neutral-800 text-neutral-400 font-medium">
              <tr>
                <th className="p-4 w-20">ID</th>
                <th className="p-4">Username</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Joined</th>
                <th className="p-4">IPs</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {loading ? (
                // Skeleton Loading
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                     <td colSpan={7} className="p-4">
                        <div className="h-8 bg-neutral-800/50 rounded w-full"></div>
                     </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                 <tr>
                    <td colSpan={7} className="p-8 text-center text-neutral-500">
                      No users found.
                    </td>
                 </tr>
              ) : (
                users.map((user) => (
                  <>
                   <tr key={user.id} className="group hover:bg-neutral-800/30 transition-colors">
                     <td className="p-4 text-neutral-500 font-mono">#{user.id}</td>
                     <td className="p-4 font-medium text-neutral-200">
                         <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/10">
                               <User className="w-4 h-4" />
                            </div>
                            {user.username}
                         </div>
                     </td>
                     <td className="p-4 text-neutral-400">{user.email}</td>
                     <td className="p-4">
                       <span
                         className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                           user.role === "admin"
                             ? "bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_10px_-4px_rgba(168,85,247,0.5)]"
                             : "bg-neutral-800 text-neutral-400 border-neutral-700"
                         }`}
                       >
                         {user.role}
                       </span>
                     </td>
                     <td className="p-4 text-neutral-500">
                      {format(new Date(user.created_at), "MMM d, yyyy")}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => fetchUserIPs(user.id)}
                        disabled={loadingIPs === user.id}
                        className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors"
                      >
                        {loadingIPs === user.id ? (
                          <span>Loading...</span>
                        ) : expandedUserId === user.id ? (
                          <><ChevronUp className="w-3 h-3" /> Hide</>  
                        ) : (
                          <><ChevronDown className="w-3 h-3" /> View</>
                        )}
                      </button>
                    </td>
                     <td className="p-4 text-right">
                       <button
                         onClick={() => toggleRole(user)}
                         className={`p-2 rounded-lg transition-all duration-200 ${
                             user.role === 'admin' 
                             ? 'hover:bg-red-500/10 hover:text-red-400 text-neutral-600'
                             : 'hover:bg-purple-500/10 hover:text-purple-400 text-neutral-600'
                         }`}
                         title={user.role === "admin" ? "Demote to User" : "Promote to Admin"}
                       >
                         {user.role === "admin" ? (
                           <ShieldAlert className="w-4 h-4" />
                         ) : (
                           <Shield className="w-4 h-4" />
                         )}
                       </button>
                     </td>
                   </tr>
                   {/* Expanded IP Row */}
                   {expandedUserId === user.id && userIPs[user.id] && (
                     <tr key={`${user.id}-ips`} className="bg-neutral-800/20">
                       <td colSpan={7} className="p-4">
                         <div className="pl-12 pr-4">
                           <h4 className="text-sm font-medium text-neutral-300 mb-3">Recent IP Addresses:</h4>
                           {userIPs[user.id].length === 0 ? (
                             <p className="text-sm text-neutral-500">No IP addresses recorded</p>
                           ) : (
                             <div className="space-y-2">
                               {userIPs[user.id].map((ipData) => (
                                 <div
                                   key={ipData.ip_address}
                                   className="flex items-center justify-between bg-neutral-900/50 rounded-lg p-3 border border-neutral-800"
                                 >
                                   <div className="flex items-center gap-3">
                                     <code className="text-sm font-mono text-neutral-300">{ipData.ip_address}</code>
                                     <span className="text-xs text-neutral-500">
                                       Last seen: {format(new Date(ipData.last_seen), "MMM d, HH:mm")}
                                     </span>
                                     {ipData.is_blocked && (
                                       <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400 border border-red-500/20">
                                         <BanIcon className="w-3 h-3" />
                                         Blocked
                                       </span>
                                     )}
                                   </div>
                                   <div>
                                     {ipData.is_blocked ? (
                                       <button
                                         onClick={() => unblockIP(ipData.ip_address, user.id)}
                                         disabled={blockingIP === ipData.ip_address}
                                         className="px-3 py-1 text-xs bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                                       >
                                         <CheckCircle className="w-3 h-3" />
                                         Unblock
                                       </button>
                                     ) : (
                                       <button
                                         onClick={() => blockIP(ipData.ip_address, user.id)}
                                         disabled={blockingIP === ipData.ip_address}
                                         className="px-3 py-1 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                                       >
                                         <Ban className="w-3 h-3" />
                                         Block IP
                                       </button>
                                     )}
                                   </div>
                                 </div>
                               ))}\n                             </div>
                           )}
                         </div>
                       </td>
                     </tr>
                   )}
                  </>
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
