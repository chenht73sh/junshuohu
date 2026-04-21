"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Calendar, Users, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Activity {
  id: number;
  title: string;
  category_name: string | null;
  speaker: string | null;
  location: string | null;
  activity_date: string;
  status: string;
  participant_count: number;
  creator_name: string | null;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: "upcoming", label: "即将开始" },
  { value: "ongoing", label: "进行中" },
  { value: "completed", label: "已结束" },
  { value: "cancelled", label: "已取消" },
];

function statusBadge(status: string) {
  switch (status) {
    case "upcoming": return "bg-green-100 text-green-700";
    case "ongoing": return "bg-blue-100 text-blue-700";
    case "completed": return "bg-gray-100 text-gray-600";
    case "cancelled": return "bg-red-100 text-red-600";
    default: return "bg-gray-100 text-gray-600";
  }
}

const EMPTY_FORM = {
  title: "", description: "", category_id: "",
  speaker: "", location: "", activity_date: "",
  start_time: "", end_time: "", max_participants: "",
  cover_image: "", summary: "", status: "upcoming",
};

export default function AdminActivitiesPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [page, setPage] = useState(1);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const fetchActivities = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/admin/activities?page=${p}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setActivities(data.activities || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchActivities(page); }, [page, fetchActivities]);

  function openCreate() {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(a: Activity) {
    setForm({
      title: a.title, description: "",
      category_id: "", speaker: a.speaker || "",
      location: a.location || "", activity_date: a.activity_date,
      start_time: "", end_time: "", max_participants: "",
      cover_image: "", summary: "", status: a.status,
    });
    setEditingId(a.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.title || !form.activity_date) {
      showToast("标题和活动日期为必填项", "error"); return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const url = editingId ? `/api/activities/${editingId}` : "/api/activities";
      const method = editingId ? "PATCH" : "POST";
      const body = {
        ...form,
        category_id: form.category_id ? parseInt(form.category_id) : null,
        max_participants: form.max_participants ? parseInt(form.max_participants) : null,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showToast(editingId ? "活动已更新" : "活动已创建", "success");
        setShowForm(false);
        fetchActivities(page);
      } else {
        const data = await res.json();
        showToast(data.error || "保存失败", "error");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("确定要删除这个活动吗？")) return;
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/activities/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      showToast("活动已删除", "success");
      fetchActivities(page);
    } else {
      showToast("删除失败", "error");
    }
  }

  async function handleExport() {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/admin/activities/export", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { showToast("导出失败", "error"); return; }
      const data = await res.json();
      const participants = data.participants || [];
      const BOM = "\uFEFF";
      const header = ["活动名称", "主讲人", "活动日期", "地点", "用户名", "显示名", "手机号", "邮箱", "是否签到", "报名时间"];
      const rows = participants.map((p: Record<string, string | number | null>) => [
        p.activity_title || "",
        p.speaker || "",
        p.activity_date || "",
        p.location || "",
        p.username || "",
        p.display_name || "",
        p.phone || "",
        p.email || "",
        p.signed_in ? "已签到" : "未签到",
        p.join_time ? new Date(p.join_time as string).toLocaleDateString("zh-CN", {
          year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit",
        }) : "",
      ]);
      const csv = [header, ...rows]
        .map((r: string[]) => r.map((c: string) => `"${c.replace(/"/g, '""')}"`).join(","))
        .join("\n");
      const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `君说乎活动报名信息_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("导出失败，请重试", "error");
    }
  }

  return (
    <div>
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-5 py-3 rounded-xl shadow-float text-sm font-medium ${
          toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">活动管理</h1>
          <p className="text-sm text-text-muted mt-0.5">共 {pagination.total} 个活动</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors"
          >
            <Download size={15} />
            导出报名信息
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-text-inverse rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            <Plus size={16} /> 新建活动
          </button>
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl shadow-float w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h2 className="font-semibold text-text-primary">{editingId ? "编辑活动" : "新建活动"}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-text-secondary mb-1">活动标题 *</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                    placeholder="活动标题"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">活动日期 *</label>
                  <input
                    type="date"
                    value={form.activity_date}
                    onChange={(e) => setForm((f) => ({ ...f, activity_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">状态</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary bg-surface"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">开始时间</label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">结束时间</label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">主讲嘉宾</label>
                  <input
                    value={form.speaker}
                    onChange={(e) => setForm((f) => ({ ...f, speaker: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                    placeholder="主讲人姓名"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">活动地点</label>
                  <input
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                    placeholder="线下地址或线上链接"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">人数上限</label>
                  <input
                    type="number"
                    value={form.max_participants}
                    onChange={(e) => setForm((f) => ({ ...f, max_participants: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                    placeholder="不填则不限人数"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-text-secondary mb-1">封面图片 URL</label>
                  <input
                    value={form.cover_image}
                    onChange={(e) => setForm((f) => ({ ...f, cover_image: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                    placeholder="https://..."
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-text-secondary mb-1">活动介绍</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
                    placeholder="详细描述活动内容…"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-text-secondary mb-1">活动回顾（结束后填写）</label>
                  <textarea
                    value={form.summary}
                    onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
                    placeholder="活动总结与回顾…"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-text-secondary border border-border rounded-lg hover:border-primary/50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-primary text-text-inverse rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
              >
                {saving ? "保存中…" : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-text-muted text-sm">加载中…</div>
        ) : activities.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">暂无活动</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">标题</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">日期</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">状态</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">报名</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">地点</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {activities.map((a) => (
                  <tr key={a.id} className="hover:bg-bg/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-primary line-clamp-1 max-w-xs">{a.title}</p>
                      {a.speaker && <p className="text-xs text-text-muted mt-0.5">{a.speaker}</p>}
                    </td>
                    <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                      {a.activity_date}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(a.status)}`}>
                        {STATUS_OPTIONS.find((o) => o.value === a.status)?.label || a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{a.participant_count} 人</td>
                    <td className="px-4 py-3 text-text-secondary text-xs max-w-[120px] truncate">
                      {a.location || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => openEdit(a)}
                          className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded transition-colors"
                          title="编辑"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(a.id)}
                          className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded transition-colors"
                          title="删除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between text-sm">
            <span className="text-text-muted">共 {pagination.total} 条</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded border border-border disabled:opacity-40 hover:border-primary/50 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-text-secondary">{page} / {pagination.totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="p-1.5 rounded border border-border disabled:opacity-40 hover:border-primary/50 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
