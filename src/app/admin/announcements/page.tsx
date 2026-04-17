"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Edit2, X, Pin, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface AnnouncementItem {
  id: number;
  title: string;
  content: string;
  image_url: string | null;
  category_id: number | null;
  author_id: number;
  is_pinned: number;
  expire_at: string | null;
  created_at: string;
  updated_at: string;
  author_name: string;
  category_name: string | null;
  category_color: string | null;
}

interface CategoryOption {
  id: number;
  name: string;
}

const emptyForm = {
  title: "",
  content: "",
  image_url: "",
  category_id: "",
  is_pinned: false,
  expire_at: "",
};

function formatDate(dateStr: string) {
  return new Date(dateStr + "Z").toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminAnnouncementsPage() {
  const { token } = useAuth();
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formLoading, setFormLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchAnnouncements = useCallback(() => {
    if (!token) return;
    fetch("/api/admin/announcements", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setAnnouncements(data.announcements || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const fetchCategories = useCallback(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchAnnouncements();
    fetchCategories();
  }, [fetchAnnouncements, fetchCategories]);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setShowModal(true);
  }

  function openEdit(ann: AnnouncementItem) {
    setForm({
      title: ann.title,
      content: ann.content,
      image_url: ann.image_url || "",
      category_id: ann.category_id ? String(ann.category_id) : "",
      is_pinned: ann.is_pinned === 1,
      expire_at: ann.expire_at?.slice(0, 16) || "",
    });
    setEditingId(ann.id);
    setShowModal(true);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "image");

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setForm((prev) => ({ ...prev, image_url: data.filePath }));
      } else {
        const data = await res.json();
        alert(data.error || "上传失败");
      }
    } catch {
      alert("上传失败");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setFormLoading(true);

    const payload = {
      title: form.title,
      content: form.content,
      image_url: form.image_url || null,
      category_id: form.category_id ? parseInt(form.category_id, 10) : null,
      is_pinned: form.is_pinned,
      expire_at: form.expire_at || null,
    };

    try {
      const url = editingId
        ? `/api/admin/announcements/${editingId}`
        : "/api/admin/announcements";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowModal(false);
        fetchAnnouncements();
      } else {
        const data = await res.json();
        alert(data.error || "操作失败");
      }
    } catch {
      alert("网络错误");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(id: number, title: string) {
    if (!token) return;
    if (!confirm(`确定要删除公告「${title}」吗？此操作不可撤销。`)) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
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

  async function handleTogglePin(ann: AnnouncementItem) {
    if (!token) return;
    setActionLoading(ann.id);
    try {
      const res = await fetch(`/api/admin/announcements/${ann.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_pinned: ann.is_pinned === 1 ? 0 : 1 }),
      });
      if (res.ok) {
        fetchAnnouncements();
      }
    } catch {
      alert("网络错误");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-semibold text-text-primary">公告管理</h1>
        <div className="h-64 rounded-xl bg-border-light animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-serif text-2xl font-semibold text-text-primary">公告管理</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-text-inverse bg-primary hover:bg-primary-dark rounded-lg transition-colors"
        >
          <Plus size={16} />
          发布公告
        </button>
      </div>

      {announcements.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <p className="text-text-muted mb-4">暂无公告</p>
          <button
            onClick={openCreate}
            className="px-4 py-2 text-sm font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
          >
            发布第一条公告
          </button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-surface border border-border rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-accent-light/30 border-b border-border">
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">标题</th>
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">板块</th>
                    <th className="text-center px-4 py-3 font-medium text-text-secondary">海报</th>
                    <th className="text-center px-4 py-3 font-medium text-text-secondary">置顶</th>
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">发布时间</th>
                    <th className="text-right px-5 py-3 font-medium text-text-secondary">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {announcements.map((ann, i) => (
                    <tr
                      key={ann.id}
                      className={i % 2 === 0 ? "bg-surface" : "bg-accent-light/10"}
                    >
                      <td className="px-5 py-3">
                        <span className="font-medium text-text-primary line-clamp-1">
                          {ann.title}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {ann.category_name ? (
                          <span
                            className="inline-block px-2 py-0.5 text-xs rounded font-medium"
                            style={{
                              color: ann.category_color || "#8B6F47",
                              backgroundColor: `${ann.category_color || "#8B6F47"}18`,
                            }}
                          >
                            {ann.category_name}
                          </span>
                        ) : (
                          <span className="text-text-muted text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {ann.image_url ? (
                          <ImageIcon size={15} className="inline text-success" />
                        ) : (
                          <span className="text-text-muted text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {ann.is_pinned === 1 ? (
                          <Pin size={14} className="inline text-error" />
                        ) : (
                          <span className="text-text-muted text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-text-muted text-xs">
                        {formatDate(ann.created_at)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleTogglePin(ann)}
                            disabled={actionLoading === ann.id}
                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                              ann.is_pinned === 1
                                ? "text-error hover:bg-error/5"
                                : "text-text-muted hover:text-warning hover:bg-warning/5"
                            }`}
                            title={ann.is_pinned === 1 ? "取消置顶" : "置顶"}
                          >
                            <Pin size={15} />
                          </button>
                          <button
                            onClick={() => openEdit(ann)}
                            disabled={actionLoading === ann.id}
                            className="p-1.5 text-text-muted hover:text-info hover:bg-info/5 rounded-lg transition-colors disabled:opacity-40"
                            title="编辑"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(ann.id, ann.title)}
                            disabled={actionLoading === ann.id}
                            className="p-1.5 text-text-muted hover:text-error hover:bg-error/5 rounded-lg transition-colors disabled:opacity-40"
                            title="删除"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="bg-surface border border-border rounded-xl p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-medium text-text-primary flex-1 line-clamp-2">
                    {ann.is_pinned === 1 && <Pin size={12} className="inline text-error mr-1" />}
                    {ann.title}
                  </h3>
                </div>

                <div className="text-xs text-text-muted space-y-1 mb-3">
                  <p>发布者：{ann.author_name}</p>
                  <p>时间：{formatDate(ann.created_at)}</p>
                  {ann.category_name && <p>板块：{ann.category_name}</p>}
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-border-light">
                  <button
                    onClick={() => openEdit(ann)}
                    disabled={actionLoading === ann.id}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-info border border-info/20 hover:bg-info/5 transition-colors disabled:opacity-40"
                  >
                    <Edit2 size={12} />
                    编辑
                  </button>
                  <button
                    onClick={() => handleTogglePin(ann)}
                    disabled={actionLoading === ann.id}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-warning border border-warning/20 hover:bg-warning/5 transition-colors disabled:opacity-40"
                  >
                    <Pin size={12} />
                    {ann.is_pinned === 1 ? "取消置顶" : "置顶"}
                  </button>
                  <button
                    onClick={() => handleDelete(ann.id, ann.title)}
                    disabled={actionLoading === ann.id}
                    className="ml-auto px-2.5 py-1.5 text-xs text-error border border-error/20 rounded-lg hover:bg-error/5 transition-colors disabled:opacity-40"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl shadow-float w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
              <h2 className="font-serif text-lg font-semibold text-text-primary">
                {editingId ? "编辑公告" : "发布公告"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-text-muted hover:text-text-primary rounded"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  标题 *
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary bg-surface"
                  placeholder="输入公告标题"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  内容 *
                </label>
                <textarea
                  required
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={5}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary bg-surface resize-none"
                  placeholder="输入公告内容"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  海报图
                </label>
                <div className="flex items-center gap-3">
                  <label className="px-3 py-2 text-sm border border-border rounded-lg cursor-pointer hover:bg-accent-light/50 transition-colors text-text-secondary">
                    {uploading ? "上传中..." : "选择图片"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                  {form.image_url && (
                    <div className="flex items-center gap-2">
                      <img
                        src={form.image_url}
                        alt="预览"
                        className="w-12 h-12 object-cover rounded border border-border-light"
                      />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, image_url: "" })}
                        className="text-xs text-error hover:underline"
                      >
                        移除
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    关联板块
                  </label>
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary bg-surface"
                  >
                    <option value="">不关联板块</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    过期时间
                  </label>
                  <input
                    type="datetime-local"
                    value={form.expire_at}
                    onChange={(e) => setForm({ ...form, expire_at: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary bg-surface"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_pinned"
                  checked={form.is_pinned}
                  onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
                  className="rounded border-border text-primary focus:ring-primary/30"
                />
                <label htmlFor="is_pinned" className="text-sm text-text-secondary">
                  置顶公告
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-lg hover:bg-accent-light/50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 text-sm font-medium text-text-inverse bg-primary hover:bg-primary-dark rounded-lg transition-colors disabled:opacity-60"
                >
                  {formLoading ? "保存中..." : editingId ? "保存修改" : "发布公告"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
