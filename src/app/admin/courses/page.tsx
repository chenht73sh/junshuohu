"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Edit2, X, Lock, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface CourseItem {
  id: number;
  title: string;
  description: string | null;
  category_id: number;
  instructor: string;
  start_time: string | null;
  location: string | null;
  max_participants: number | null;
  current_participants: number;
  status: string;
  created_at: string;
  category_name: string;
  category_color: string;
}

interface CategoryOption {
  id: number;
  name: string;
}

const statusLabels: Record<string, string> = {
  open: "报名中",
  closed: "已关闭",
  completed: "已结束",
};
const statusStyles: Record<string, string> = {
  open: "bg-[#6B8F71]/10 text-[#6B8F71]",
  closed: "bg-[#D4A574]/10 text-[#D4A574]",
  completed: "bg-[#A69882]/10 text-[#A69882]",
};

const emptyForm = {
  title: "",
  description: "",
  category_id: "",
  instructor: "",
  start_time: "",
  location: "",
  max_participants: "",
};

export default function AdminCoursesPage() {
  const { token } = useAuth();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formLoading, setFormLoading] = useState(false);

  const fetchCourses = useCallback(() => {
    if (!token) return;
    fetch("/api/admin/courses", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setCourses(data.courses || []))
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
    fetchCourses();
    fetchCategories();
  }, [fetchCourses, fetchCategories]);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setShowModal(true);
  }

  function openEdit(course: CourseItem) {
    setForm({
      title: course.title,
      description: course.description || "",
      category_id: String(course.category_id),
      instructor: course.instructor,
      start_time: course.start_time?.slice(0, 16) || "",
      location: course.location || "",
      max_participants: course.max_participants ? String(course.max_participants) : "",
    });
    setEditingId(course.id);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setFormLoading(true);

    const payload = {
      title: form.title,
      description: form.description || null,
      category_id: parseInt(form.category_id, 10),
      instructor: form.instructor,
      start_time: form.start_time || null,
      location: form.location || null,
      max_participants: form.max_participants ? parseInt(form.max_participants, 10) : null,
    };

    try {
      const url = editingId
        ? `/api/admin/courses/${editingId}`
        : "/api/admin/courses";
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
        fetchCourses();
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

  async function handleStatusChange(courseId: number, newStatus: string) {
    if (!token) return;
    setActionLoading(courseId);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setCourses((prev) =>
          prev.map((c) => (c.id === courseId ? { ...c, status: newStatus } : c))
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

  async function handleDelete(courseId: number, title: string) {
    if (!token) return;
    if (!confirm(`确定要删除课程「${title}」吗？此操作不可撤销。`)) return;
    setActionLoading(courseId);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setCourses((prev) => prev.filter((c) => c.id !== courseId));
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

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function handleExport() {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/courses/export", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { alert("导出失败"); return; }
      const data = await res.json();
      const enrollments = data.enrollments || [];
      const BOM = "\uFEFF";
      const header = ["课程名称", "讲师", "开课时间", "用户名", "显示名", "手机号", "邮箱", "报名时间"];
      const rows = enrollments.map((e: Record<string, string | null>) => [
        e.course_title || "",
        e.instructor || "",
        e.start_time ? formatDate(e.start_time) : "",
        e.username || "",
        e.display_name || "",
        e.phone || "",
        e.email || "",
        e.enroll_time ? formatDate(e.enroll_time) : "",
      ]);
      const csv = [header, ...rows]
        .map((r) => r.map((c: string) => `"${c.replace(/"/g, '""')}"`).join(","))
        .join("\n");
      const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `君说乎课程报名信息_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("导出失败，请重试");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-semibold text-text-primary">课程管理</h1>
        <div className="h-64 rounded-xl bg-border-light animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-serif text-2xl font-semibold text-text-primary">课程管理</h1>
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
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-text-inverse bg-primary hover:bg-primary-dark rounded-lg transition-colors"
          >
            <Plus size={16} />
            创建新课程
          </button>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <p className="text-text-muted mb-4">暂无课程</p>
          <button
            onClick={openCreate}
            className="px-4 py-2 text-sm font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
          >
            创建第一个课程
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
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">课程名称</th>
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">讲师</th>
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">时间</th>
                    <th className="text-center px-4 py-3 font-medium text-text-secondary">报名人数</th>
                    <th className="text-center px-4 py-3 font-medium text-text-secondary">状态</th>
                    <th className="text-right px-5 py-3 font-medium text-text-secondary">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {courses.map((c, i) => (
                    <tr
                      key={c.id}
                      className={i % 2 === 0 ? "bg-surface" : "bg-accent-light/10"}
                    >
                      <td className="px-5 py-3">
                        <span className="font-medium text-text-primary line-clamp-1">
                          {c.title}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-text-secondary">{c.instructor}</td>
                      <td className="px-5 py-3 text-text-muted text-xs">{formatDate(c.start_time)}</td>
                      <td className="px-4 py-3 text-center text-text-secondary">
                        {c.current_participants}
                        {c.max_participants ? `/${c.max_participants}` : ""}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            statusStyles[c.status] || ""
                          }`}
                        >
                          {statusLabels[c.status] || c.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(c)}
                            disabled={actionLoading === c.id}
                            className="p-1.5 text-text-muted hover:text-info hover:bg-info/5 rounded-lg transition-colors disabled:opacity-40"
                            title="编辑"
                          >
                            <Edit2 size={15} />
                          </button>
                          {c.status === "open" && (
                            <button
                              onClick={() => handleStatusChange(c.id, "closed")}
                              disabled={actionLoading === c.id}
                              className="p-1.5 text-text-muted hover:text-warning hover:bg-warning/5 rounded-lg transition-colors disabled:opacity-40"
                              title="关闭报名"
                            >
                              <Lock size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(c.id, c.title)}
                            disabled={actionLoading === c.id}
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
            {courses.map((c) => (
              <div
                key={c.id}
                className="bg-surface border border-border rounded-xl p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-medium text-text-primary flex-1 line-clamp-2">
                    {c.title}
                  </h3>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                      statusStyles[c.status] || ""
                    }`}
                  >
                    {statusLabels[c.status] || c.status}
                  </span>
                </div>

                <div className="text-xs text-text-muted space-y-1 mb-3">
                  <p>讲师：{c.instructor}</p>
                  <p>时间：{formatDate(c.start_time)}</p>
                  <p>
                    报名：{c.current_participants}
                    {c.max_participants ? `/${c.max_participants}` : ""} 人
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-border-light">
                  <button
                    onClick={() => openEdit(c)}
                    disabled={actionLoading === c.id}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-info border border-info/20 hover:bg-info/5 transition-colors disabled:opacity-40"
                  >
                    <Edit2 size={12} />
                    编辑
                  </button>
                  {c.status === "open" && (
                    <button
                      onClick={() => handleStatusChange(c.id, "closed")}
                      disabled={actionLoading === c.id}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-warning border border-warning/20 hover:bg-warning/5 transition-colors disabled:opacity-40"
                    >
                      <Lock size={12} />
                      关闭报名
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(c.id, c.title)}
                    disabled={actionLoading === c.id}
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
                {editingId ? "编辑课程" : "创建新课程"}
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
                  课程名称 *
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary bg-surface"
                  placeholder="输入课程名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  课程简介
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary bg-surface resize-none"
                  placeholder="输入课程简介"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    所属板块 *
                  </label>
                  <select
                    required
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary bg-surface"
                  >
                    <option value="">选择板块</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    讲师 *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.instructor}
                    onChange={(e) => setForm({ ...form, instructor: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary bg-surface"
                    placeholder="讲师姓名"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    开课时间
                  </label>
                  <input
                    type="datetime-local"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary bg-surface"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    上课地点
                  </label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary bg-surface"
                    placeholder="线上/线下地址"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  人数上限
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.max_participants}
                  onChange={(e) => setForm({ ...form, max_participants: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary bg-surface"
                  placeholder="留空则不限人数"
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
                  {formLoading ? "保存中..." : editingId ? "保存修改" : "创建课程"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
