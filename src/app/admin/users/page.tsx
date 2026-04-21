"use client";

import { useEffect, useState, useCallback } from "react";
import { Trash2, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface UserItem {
  id: number;
  username: string;
  email: string | null;
  phone: string | null;
  display_name: string;
  role: string;
  total_points: number;
  created_at: string;
}

const roleOptions = ["admin", "moderator", "member"] as const;
const roleStyles: Record<string, string> = {
  admin: "bg-[#8B6F47]/10 text-[#8B6F47] border-[#8B6F47]/20",
  moderator: "bg-[#4A90D9]/10 text-[#4A90D9] border-[#4A90D9]/20",
  member: "bg-[#6B8F71]/10 text-[#6B8F71] border-[#6B8F71]/20",
};
const roleLabels: Record<string, string> = {
  admin: "管理员",
  moderator: "版主",
  member: "成员",
};

export default function AdminUsersPage() {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchUsers = useCallback(() => {
    if (!token) return;
    fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setUsers(data.users || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleRoleChange(userId: number, newRole: string) {
    if (!token) return;
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
      } else {
        const data = await res.json();
        alert(data.error || "操作失败");
      }
    } catch {
      alert("网络错误");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(userId: number, displayName: string) {
    if (!token) return;
    if (!confirm(`确定要删除用户「${displayName}」吗？此操作不可撤销。`)) return;
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } else {
        const data = await res.json();
        alert(data.error || "删除失败");
      }
    } catch {
      alert("网络错误");
    } finally {
      setActionLoading(null);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  function handleExport() {
    const BOM = "\uFEFF";
    const header = ["用户名", "显示名", "邮箱", "手机号", "角色", "积分", "注册时间"];
    const rows = users.map((u) => [
      u.username,
      u.display_name,
      u.email || "",
      u.phone || "",
      roleLabels[u.role] || u.role,
      String(u.total_points ?? 0),
      formatDate(u.created_at),
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `君说乎用户信息_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-semibold text-text-primary">用户管理</h1>
        <div className="h-64 rounded-xl bg-border-light animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-text-primary">用户管理</h1>
          <span className="text-sm text-text-muted">共 {users.length} 位用户</span>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Download size={15} />
          导出用户信息
        </button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-surface border border-border rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-accent-light/30 border-b border-border">
                <th className="text-left px-5 py-3 font-medium text-text-secondary">用户名</th>
                <th className="text-left px-5 py-3 font-medium text-text-secondary">手机号</th>
                <th className="text-left px-5 py-3 font-medium text-text-secondary">邮箱</th>
                <th className="text-left px-5 py-3 font-medium text-text-secondary">角色</th>
                <th className="text-left px-5 py-3 font-medium text-text-secondary">注册时间</th>
                <th className="text-right px-5 py-3 font-medium text-text-secondary">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {users.map((u, i) => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr
                    key={u.id}
                    className={i % 2 === 0 ? "bg-surface" : "bg-accent-light/10"}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-medium text-primary">
                            {u.display_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-text-primary">{u.display_name}</span>
                          <span className="text-text-muted ml-1 text-xs">@{u.username}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-text-secondary">{u.phone || "—"}</td>
                    <td className="px-5 py-3 text-text-secondary">{u.email || "—"}</td>
                    <td className="px-5 py-3">
                      {currentUser?.role === "admin" && !isSelf ? (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={actionLoading === u.id}
                          className={`px-2 py-1 rounded-full text-xs font-medium border cursor-pointer ${roleStyles[u.role]} focus:outline-none`}
                        >
                          {roleOptions.map((r) => (
                            <option key={r} value={r}>
                              {roleLabels[r]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${roleStyles[u.role]}`}
                        >
                          {roleLabels[u.role] || u.role}
                          {isSelf && " (你)"}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-text-muted">{formatDate(u.created_at)}</td>
                    <td className="px-5 py-3 text-right">
                      {currentUser?.role === "admin" && !isSelf && (
                        <button
                          onClick={() => handleDelete(u.id, u.display_name)}
                          disabled={actionLoading === u.id}
                          className="p-1.5 text-text-muted hover:text-error hover:bg-error/5 rounded-lg transition-colors disabled:opacity-40"
                          title="删除用户"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {users.map((u) => {
          const isSelf = u.id === currentUser?.id;
          return (
            <div
              key={u.id}
              className="bg-surface border border-border rounded-xl p-4 shadow-card"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-medium text-primary">
                      {u.display_name.charAt(0)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {u.display_name}
                    </p>
                    <p className="text-xs text-text-muted">@{u.username}</p>
                  </div>
                </div>
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${roleStyles[u.role]}`}
                >
                  {roleLabels[u.role] || u.role}
                </span>
              </div>

              <div className="text-xs text-text-muted space-y-1">
                <p>手机：{u.phone || "—"}</p>
                <p>邮箱：{u.email || "—"}</p>
                <p>注册时间：{formatDate(u.created_at)}</p>
              </div>

              {currentUser?.role === "admin" && !isSelf && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-light">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    disabled={actionLoading === u.id}
                    className="flex-1 px-2 py-1.5 rounded-lg text-xs border border-border bg-surface focus:outline-none focus:border-primary"
                  >
                    {roleOptions.map((r) => (
                      <option key={r} value={r}>
                        {roleLabels[r]}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleDelete(u.id, u.display_name)}
                    disabled={actionLoading === u.id}
                    className="px-3 py-1.5 text-xs text-error border border-error/20 rounded-lg hover:bg-error/5 transition-colors disabled:opacity-40"
                  >
                    删除
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
