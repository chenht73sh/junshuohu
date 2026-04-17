"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Edit2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface CategoryItem {
  id: number;
  name: string;
  description: string | null;
  moderator_name: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
  post_count: number;
  created_at: string;
}

const PRESET_COLORS = [
  { value: "#4A90D9", label: "蓝" },
  { value: "#9B59B6", label: "紫" },
  { value: "#2ECC71", label: "绿" },
  { value: "#E74C3C", label: "红" },
  { value: "#F39C12", label: "橙" },
  { value: "#E67E22", label: "深橙" },
  { value: "#3498DB", label: "天蓝" },
  { value: "#E91E63", label: "粉" },
  { value: "#00BCD4", label: "青" },
  { value: "#8B6F47", label: "棕" },
];

const emptyForm = {
  name: "",
  moderator_name: "",
  description: "",
  color: "#4A90D9",
  sort_order: "0",
};

export default function AdminCategoriesPage() {
  const { token, user } = useAuth();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formLoading, setFormLoading] = useState(false);

  const isAdmin = user?.role === "admin";

  const fetchCategories = useCallback(() => {
    if (!token) return;
    fetch("/api/admin/categories", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setShowModal(true);
  }

  function openEdit(cat: CategoryItem) {
    setForm({
      name: cat.name,
      moderator_name: cat.moderator_name || "",
      description: cat.description || "",
      color: cat.color || "#4A90D9",
      sort_order: String(cat.sort_order),
    });
    setEditingId(cat.id);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setFormLoading(true);

    const payload = {
      name: form.name,
      description: form.description,
      moderator_name: form.moderator_name,
      color: form.color,
      sort_order: parseInt(form.sort_order, 10) || 0,
    };

    try {
      const url = editingId
        ? `/api/admin/categories/${editingId}`
        : "/api/admin/categories";
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
        fetchCategories();
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

  async function handleDelete(categoryId: number, name: string) {
    if (!token) return;
    setActionLoading(categoryId);

    try {
      // First call without confirmed to check post count
      const checkRes = await fetch(`/api/admin/categories/${categoryId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const checkData = await checkRes.json();

      if (checkData.warning) {
        // Has posts — ask for confirmation with post count warning
        if (
          !confirm(
            `⚠️ 板块「${name}」下有 ${checkData.post_count} 篇帖子。\n删除板块将同时删除所有帖子和评论，此操作不可撤销。\n\n确定要删除吗？`
          )
        ) {
          setActionLoading(null);
          return;
        }

        // Confirmed — call with confirmed=true
        const delRes = await fetch(
          `/api/admin/categories/${categoryId}?confirmed=true`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (delRes.ok) {
          setCategories((prev) => prev.filter((c) => c.id !== categoryId));
        } else {
          const data = await delRes.json();
          alert(data.error || "删除失败");
        }
      } else if (checkRes.ok) {
        // No posts or already deleted
        setCategories((prev) => prev.filter((c) => c.id !== categoryId));
      } else {
        alert(checkData.error || "删除失败");
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
        <h1 className="font-serif text-2xl font-semibold text-text-primary">板块管理</h1>
        <div className="h-64 rounded-xl bg-border-light animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-serif text-2xl font-semibold text-text-primary">板块管理</h1>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-text-inverse bg-primary hover:bg-primary-dark rounded-lg transition-colors"
          >
            <Plus size={16} />
            新增板块
          </button>
        )}
      </div>

      {categories.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <p className="text-text-muted mb-4">暂无板块</p>
          {isAdmin && (
            <button
              onClick={openCreate}
              className="px-4 py-2 text-sm font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
            >
              创建第一个板块
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-surface border border-border rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-accent-light/30 border-b border-border">
                    <th className="text-left px-5 py-3 font-medium text-text-secondary w-10">颜色</th>
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">板块名称</th>
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">主理人</th>
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">描述</th>
                    <th className="text-center px-4 py-3 font-medium text-text-secondary">帖子数</th>
                    <th className="text-center px-4 py-3 font-medium text-text-secondary">排序</th>
                    {isAdmin && (
                      <th className="text-right px-5 py-3 font-medium text-text-secondary">操作</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {categories.map((cat, i) => (
                    <tr
                      key={cat.id}
                      className={i % 2 === 0 ? "bg-surface" : "bg-accent-light/10"}
                    >
                      <td className="px-5 py-3">
                        <div
                          className="w-4 h-4 rounded-full ring-1 ring-black/10"
                          style={{ backgroundColor: cat.color || "#999" }}
                        />
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-medium text-text-primary">{cat.name}</span>
                      </td>
                      <td className="px-5 py-3 text-text-secondary">{cat.moderator_name || "—"}</td>
                      <td className="px-5 py-3 text-text-muted text-xs max-w-[200px] truncate">
                        {cat.description || "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-text-secondary">{cat.post_count}</td>
                      <td className="px-4 py-3 text-center text-text-secondary">{cat.sort_order}</td>
                      {isAdmin && (
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(cat)}
                              disabled={actionLoading === cat.id}
                              className="p-1.5 text-text-muted hover:text-info hover:bg-info/5 rounded-lg transition-colors disabled:opacity-40"
                              title="编辑"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(cat.id, cat.name)}
                              disabled={actionLoading === cat.id}
                              className="p-1.5 text-text-muted hover:text-error hover:bg-error/5 rounded-lg transition-colors disabled:opacity-40"
                              title="删除"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-surface border border-border rounded-xl overflow-hidden shadow-card"
              >
                {/* Color bar */}
                <div
                  className="h-1.5"
                  style={{ backgroundColor: cat.color || "#999" }}
                />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-medium text-text-primary flex-1">
                      {cat.name}
                    </h3>
                    <span className="text-xs text-text-muted shrink-0">
                      排序：{cat.sort_order}
                    </span>
                  </div>

                  <div className="text-xs text-text-muted space-y-1 mb-3">
                    <p>主理人：{cat.moderator_name || "—"}</p>
                    <p className="line-clamp-2">{cat.description || "暂无描述"}</p>
                    <p>帖子数：{cat.post_count}</p>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-2 pt-3 border-t border-border-light">
                      <button
                        onClick={() => openEdit(cat)}
                        disabled={actionLoading === cat.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-info border border-info/20 hover:bg-info/5 transition-colors disabled:opacity-40"
                      >
                        <Edit2 size={12} />
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id, cat.name)}
                        disabled={actionLoading === cat.id}
                        className="ml-auto px-2.5 py-1.5 text-xs text-error border border-error/20 rounded-lg hover:bg-error/5 transition-colors disabled:opacity-40"
                      >
                        删除
                      </button>
                    </div>
                  )}
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
                {editingId ? "编辑板块" : "新增板块"}
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
                  板块名称 *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary bg-surface"
                  placeholder="输入板块名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  主理人 *
                </label>
                <input
                  type="text"
                  required
                  value={form.moderator_name}
                  onChange={(e) => setForm({ ...form, moderator_name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary bg-surface"
                  placeholder="输入主理人名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  描述 *
                </label>
                <textarea
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary bg-surface resize-none"
                  placeholder="输入板块描述"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  颜色
                </label>
                <div className="flex flex-wrap gap-2.5 mt-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setForm({ ...form, color: c.value })}
                      className={`w-8 h-8 rounded-full transition-all ring-offset-2 ring-offset-surface ${
                        form.color === c.value
                          ? "ring-2 ring-primary scale-110"
                          : "ring-1 ring-black/10 hover:scale-105"
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  排序号
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary bg-surface"
                  placeholder="数字越小排越前"
                />
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
                  {formLoading ? "保存中..." : editingId ? "保存修改" : "创建板块"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
