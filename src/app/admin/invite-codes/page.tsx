"use client";

import { useEffect, useState, useCallback } from "react";
import { Copy, Ban, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface InviteCode {
  id: number;
  code: string;
  created_by: number;
  used_by: number | null;
  max_uses: number;
  used_count: number;
  is_active: number;
  note: string | null;
  created_at: string;
  used_at: string | null;
}

function getStatus(item: InviteCode): { label: string; className: string } {
  if (!item.is_active) {
    return { label: "已作废", className: "bg-red-100 text-red-700 border border-red-200" };
  }
  if (item.used_count >= item.max_uses) {
    return { label: "已用完", className: "bg-gray-100 text-gray-600 border border-gray-200" };
  }
  return { label: "可用", className: "bg-green-100 text-green-700 border border-green-200" };
}

export default function AdminInviteCodesPage() {
  const { token } = useAuth();
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [maxUses, setMaxUses] = useState(10);
  const [note, setNote] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [copySuccess, setCopySuccess] = useState<number | null>(null);

  const fetchCodes = useCallback(() => {
    if (!token) return;
    fetch("/api/admin/invite-codes", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setCodes(data.invite_codes || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  async function handleCreate() {
    if (!token) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/invite-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ max_uses: maxUses, note: note.trim() || null }),
      });
      if (res.ok) {
        const data = await res.json();
        setCodes((prev) => [data.invite_code, ...prev]);
        setShowForm(false);
        setMaxUses(1);
        setNote("");
      } else {
        const data = await res.json();
        alert(data.error || "创建失败");
      }
    } catch {
      alert("网络错误");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeactivate(id: number, code: string) {
    if (!token) return;
    if (!confirm(`确定要作废邀请码「${code}」吗？作废后无法恢复。`)) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/invite-codes/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setCodes((prev) =>
          prev.map((c) => (c.id === id ? { ...c, is_active: 0 } : c))
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

  function handleCopy(id: number, code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopySuccess(id);
      setTimeout(() => setCopySuccess(null), 2000);
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-text-primary">
            🔑 邀请码管理
          </h1>
          <p className="text-sm text-text-muted mt-1">
            管理注册邀请码，控制用户注册入口
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-text-inverse rounded-lg hover:bg-primary-dark transition-colors font-medium text-sm"
        >
          <Plus size={16} />
          生成邀请码
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card p-6 border border-primary/20 bg-primary/5">
          <h3 className="font-medium text-text-primary mb-4">生成新邀请码</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm text-text-secondary mb-1">
                可使用次数
              </label>
              <input
                type="number"
                min={1}
                max={999}
                value={maxUses}
                onChange={(e) => setMaxUses(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
              />
            </div>
            <div className="flex-[2]">
              <label className="block text-sm text-text-secondary mb-1">
                备注（选填）
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="如：发给张三"
                maxLength={100}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-5 py-2 bg-primary text-text-inverse rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors font-medium text-sm whitespace-nowrap"
              >
                {creating ? "生成中..." : "确认生成"}
              </button>
              <button
                onClick={() => { setShowForm(false); setMaxUses(1); setNote(""); }}
                className="px-4 py-2 border border-border text-text-secondary rounded-lg hover:bg-accent-light/50 transition-colors text-sm whitespace-nowrap"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent-light/30">
                <th className="text-left px-4 py-3 font-medium text-text-secondary">邀请码</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">状态</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">使用次数</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">备注</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">创建时间</th>
                <th className="text-right px-4 py-3 font-medium text-text-secondary">操作</th>
              </tr>
            </thead>
            <tbody>
              {codes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-text-muted">
                    暂无邀请码，点击上方按钮生成
                  </td>
                </tr>
              ) : (
                codes.map((item) => {
                  const status = getStatus(item);
                  const isActive = item.is_active && item.used_count < item.max_uses;
                  return (
                    <tr key={item.id} className="border-b border-border/50 hover:bg-accent-light/20 transition-colors">
                      <td className="px-4 py-3">
                        <code className="px-2 py-1 bg-accent-light/50 rounded text-text-primary font-mono text-sm font-semibold">
                          {item.code}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {item.used_count} / {item.max_uses}
                      </td>
                      <td className="px-4 py-3 text-text-muted max-w-[200px] truncate">
                        {item.note || "—"}
                      </td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                        {new Date(item.created_at).toLocaleString("zh-CN", {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleCopy(item.id, item.code)}
                            className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded transition-colors"
                            title="复制邀请码"
                          >
                            {copySuccess === item.id ? (
                              <span className="text-xs text-green-600 font-medium px-1">已复制</span>
                            ) : (
                              <Copy size={15} />
                            )}
                          </button>
                          {isActive && (
                            <button
                              onClick={() => handleDeactivate(item.id, item.code)}
                              disabled={actionLoading === item.id}
                              className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded transition-colors disabled:opacity-50"
                              title="作废"
                            >
                              <Ban size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
