"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle, Clock } from "lucide-react";

interface ResetRequest {
  id: number;
  username_or_email: string;
  status: "pending" | "handled";
  created_at: string;
  handled_at: string | null;
}

export default function AdminPasswordResetsPage() {
  const { token } = useAuth();
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/password-resets", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  async function handleMarkHandled(id: number) {
    if (!token) return;
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/password-resets/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, status: "handled", handled_at: new Date().toISOString() }
              : r
          )
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  }

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const handledRequests = requests.filter((r) => r.status === "handled");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-text-primary">
          🔑 密码重置申请
        </h1>
        <p className="text-sm text-text-muted mt-1">
          管理用户密码重置申请，处理后请通过微信联系用户
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[20vh]">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pending */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} className="text-amber-500" />
              <h2 className="font-medium text-text-primary">
                待处理申请
                {pendingRequests.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                    {pendingRequests.length}
                  </span>
                )}
              </h2>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="card p-8 text-center text-text-muted text-sm">
                暂无待处理申请 🎉
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-accent-light/30">
                      <th className="text-left px-5 py-3 font-medium text-text-secondary">用户名 / 邮箱</th>
                      <th className="text-left px-5 py-3 font-medium text-text-secondary">申请时间</th>
                      <th className="text-right px-5 py-3 font-medium text-text-secondary">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRequests.map((req) => (
                      <tr key={req.id} className="border-b border-border-light last:border-0 hover:bg-accent-light/20 transition-colors">
                        <td className="px-5 py-4 font-medium text-text-primary">{req.username_or_email}</td>
                        <td className="px-5 py-4 text-text-muted">
                          {new Date(req.created_at).toLocaleString("zh-CN")}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => handleMarkHandled(req.id)}
                            disabled={processingId === req.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
                          >
                            <CheckCircle size={13} />
                            {processingId === req.id ? "处理中..." : "已处理"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Handled */}
          {handledRequests.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle size={18} className="text-green-500" />
                <h2 className="font-medium text-text-primary">已处理申请</h2>
              </div>
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-accent-light/30">
                      <th className="text-left px-5 py-3 font-medium text-text-secondary">用户名 / 邮箱</th>
                      <th className="text-left px-5 py-3 font-medium text-text-secondary">申请时间</th>
                      <th className="text-left px-5 py-3 font-medium text-text-secondary">处理时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {handledRequests.map((req) => (
                      <tr key={req.id} className="border-b border-border-light last:border-0 opacity-60">
                        <td className="px-5 py-4 text-text-primary">{req.username_or_email}</td>
                        <td className="px-5 py-4 text-text-muted">
                          {new Date(req.created_at).toLocaleString("zh-CN")}
                        </td>
                        <td className="px-5 py-4 text-text-muted">
                          {req.handled_at ? new Date(req.handled_at).toLocaleString("zh-CN") : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
