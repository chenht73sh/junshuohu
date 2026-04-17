"use client";

import { useEffect, useState, useCallback } from "react";
import { Pin, Star, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface PostItem {
  id: number;
  title: string;
  is_pinned: number;
  is_featured: number;
  view_count: number;
  created_at: string;
  updated_at: string;
  author_name: string;
  category_name: string;
  category_color: string;
}

export default function AdminPostsPage() {
  const { token } = useAuth();
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchPosts = useCallback(() => {
    if (!token) return;
    fetch("/api/admin/posts", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setPosts(data.posts || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  async function toggleField(postId: number, field: "is_pinned" | "is_featured", current: number) {
    if (!token) return;
    setActionLoading(postId);
    try {
      const res = await fetch(`/api/admin/posts/${postId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [field]: current ? 0 : 1 }),
      });
      if (res.ok) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, [field]: current ? 0 : 1 } : p
          )
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

  async function handleDelete(postId: number, title: string) {
    if (!token) return;
    if (!confirm(`确定要删除帖子「${title}」吗？此操作不可撤销。`)) return;
    setActionLoading(postId);
    try {
      const res = await fetch(`/api/admin/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
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

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-semibold text-text-primary">帖子管理</h1>
        <div className="h-64 rounded-xl bg-border-light animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-text-primary">帖子管理</h1>
        <span className="text-sm text-text-muted">共 {posts.length} 篇帖子</span>
      </div>

      {posts.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <p className="text-text-muted">暂无帖子</p>
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
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">作者</th>
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">板块</th>
                    <th className="text-center px-3 py-3 font-medium text-text-secondary">置顶</th>
                    <th className="text-center px-3 py-3 font-medium text-text-secondary">精华</th>
                    <th className="text-right px-4 py-3 font-medium text-text-secondary">浏览</th>
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">发布时间</th>
                    <th className="text-right px-5 py-3 font-medium text-text-secondary">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {posts.map((p, i) => (
                    <tr
                      key={p.id}
                      className={i % 2 === 0 ? "bg-surface" : "bg-accent-light/10"}
                    >
                      <td className="px-5 py-3">
                        <span className="font-medium text-text-primary line-clamp-1 max-w-[200px] block">
                          {p.title}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-text-secondary">{p.author_name}</td>
                      <td className="px-5 py-3">
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: p.category_color }}
                        >
                          {p.category_name}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => toggleField(p.id, "is_pinned", p.is_pinned)}
                          disabled={actionLoading === p.id}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                            p.is_pinned
                              ? "text-primary bg-primary/10"
                              : "text-text-muted hover:text-primary hover:bg-primary/5"
                          }`}
                          title={p.is_pinned ? "取消置顶" : "置顶"}
                        >
                          <Pin size={15} />
                        </button>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => toggleField(p.id, "is_featured", p.is_featured)}
                          disabled={actionLoading === p.id}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                            p.is_featured
                              ? "text-warning bg-warning/10"
                              : "text-text-muted hover:text-warning hover:bg-warning/5"
                          }`}
                          title={p.is_featured ? "取消精华" : "精华"}
                        >
                          <Star size={15} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right text-text-muted">{p.view_count}</td>
                      <td className="px-5 py-3 text-text-muted">{formatDate(p.created_at)}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleDelete(p.id, p.title)}
                          disabled={actionLoading === p.id}
                          className="p-1.5 text-text-muted hover:text-error hover:bg-error/5 rounded-lg transition-colors disabled:opacity-40"
                          title="删除帖子"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {posts.map((p) => (
              <div
                key={p.id}
                className="bg-surface border border-border rounded-xl p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-medium text-text-primary line-clamp-2 flex-1">
                    {p.is_pinned ? <Pin size={13} className="inline mr-1 text-primary" /> : null}
                    {p.is_featured ? <Star size={13} className="inline mr-1 text-warning" /> : null}
                    {p.title}
                  </h3>
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white shrink-0"
                    style={{ backgroundColor: p.category_color }}
                  >
                    {p.category_name}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-text-muted mb-3">
                  <span>{p.author_name}</span>
                  <span>·</span>
                  <span>{p.view_count} 浏览</span>
                  <span>·</span>
                  <span>{formatDate(p.created_at)}</span>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-border-light">
                  <button
                    onClick={() => toggleField(p.id, "is_pinned", p.is_pinned)}
                    disabled={actionLoading === p.id}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-40 ${
                      p.is_pinned
                        ? "text-primary bg-primary/10"
                        : "text-text-muted hover:text-primary border border-border"
                    }`}
                  >
                    <Pin size={12} />
                    {p.is_pinned ? "取消置顶" : "置顶"}
                  </button>
                  <button
                    onClick={() => toggleField(p.id, "is_featured", p.is_featured)}
                    disabled={actionLoading === p.id}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-40 ${
                      p.is_featured
                        ? "text-warning bg-warning/10"
                        : "text-text-muted hover:text-warning border border-border"
                    }`}
                  >
                    <Star size={12} />
                    {p.is_featured ? "取消精华" : "精华"}
                  </button>
                  <button
                    onClick={() => handleDelete(p.id, p.title)}
                    disabled={actionLoading === p.id}
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
    </div>
  );
}
