
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { Shield, ShieldAlert, User, Search } from "lucide-react";
import { PaginationControl } from "@/components/ui/pagination-control";
import { Input } from "@/components/ui/input";

interface UserData {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at: string;
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 10;

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
        
        {/* Optional Search - purely visual for now unless backend supports search */}
        {/* <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <Input placeholder="Search users..." className="pl-9 w-64 bg-neutral-900 border-neutral-800" />
        </div> */}
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
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {loading ? (
                // Skeleton Loading
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                     <td colSpan={6} className="p-4">
                        <div className="h-8 bg-neutral-800/50 rounded w-full"></div>
                     </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                 <tr>
                    <td colSpan={6} className="p-8 text-center text-neutral-500">
                      No users found.
                    </td>
                 </tr>
              ) : (
                users.map((user) => (
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
