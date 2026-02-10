
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { Shield, ShieldAlert, User } from "lucide-react";

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

  const fetchUsers = async () => {
    try {
      const res = await api.get("/admin/users");
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleRole = async (user: UserData) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    if (!confirm(`Are you sure you want to change ${user.username}'s role to ${newRole}?`)) return;

    try {
      const res = await api.patch(`/admin/users/${user.id}/role`, null, {
        params: { role: newRole }
      });
      
      if (res.data.success) {
        toast.success(`User role updated to ${newRole}`);
        fetchUsers();
      }
    } catch (error) {
      console.error("Failed to update role", error);
      toast.error("Failed to update role");
    }
  };

  if (loading) {
    return <div className="text-white text-center py-20">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          User Management
        </h1>
        <span className="text-zinc-500">{users.length} Users</span>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400">
            <tr>
              <th className="p-4">ID</th>
              <th className="p-4">Username</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4">Joined</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-zinc-900/30 transition-colors">
                <td className="p-4 text-zinc-500">#{user.id}</td>
                <td className="p-4 font-medium text-white">{user.username}</td>
                <td className="p-4 text-zinc-400">{user.email}</td>
                <td className="p-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium border ${
                      user.role === "admin"
                        ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                        : "bg-zinc-800 text-zinc-400 border-zinc-700"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="p-4 text-zinc-500 text-sm">
                  {format(new Date(user.created_at), "PPp")}
                </td>
                <td className="p-4">
                  <button
                    onClick={() => toggleRole(user)}
                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors group"
                    title={user.role === "admin" ? "Demote to User" : "Promote to Admin"}
                  >
                    {user.role === "admin" ? (
                      <ShieldAlert className="w-4 h-4 text-red-400 group-hover:text-red-300" />
                    ) : (
                      <Shield className="w-4 h-4 text-zinc-500 group-hover:text-purple-400" />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
