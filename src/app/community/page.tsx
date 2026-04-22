"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Pin,
  Flame,
  MessageCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  PenSquare,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

/* ── Types ── */

interface Post {
  id: number;
  title: string;
  author_id: number;
  author_name: string;
  category_id: number;
  category_name: string;
  category_color: string | null;
  is_pinned: number;
  is_featured: number;
  view_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  last_reply_time: string;
}

interface Category {
  id: number;
  name: string;
  color: string | null;
}

type FilterType = "all" | "pinned" | "featured";

/* ── Helpers ── */

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr + (dateStr.endsWith("Z") ? "" : "Z"));
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days === 1) return "昨天";
  if (days < 30) return `${days} 天前`;
  return date.toLocaleDateString("zh-CN");
}

/* ── Component ── */

export default function CommunityPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCatPicker, setShowCatPicker] = useState(false);

  function handleNewPost() {
    if (!user) { router.push("/login"); return; }
    // 如果当前已选了某个板块，直接跳转；否则弹出板块选择
    if (categoryId !== "all") {
      router.push(`/community/${categoryId}/new-post`);
    } else {
      setShowCatPicker(true);
    }
  }

  const LIMIT = 20;

  /* Fetch categories once */
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        if (data.categories) setCategories(data.categories);
      })
      .catch(() => {});
  }, []);

  /* Fetch posts */
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        filter,
        page: String(page),
        limit: String(LIMIT),
      });
      if (categoryId !== "all") params.set("category", categoryId);

      const res = await fetch(`/api/posts?${params}`);
      const data = await res.json();
      setPosts(data.posts ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotal(data.total ?? 0);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [filter, categoryId, page]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  /* Reset page when filter/category changes */
  const changeFilter = (f: FilterType) => {
    setFilter(f);
    setPage(1);
  };
  const changeCategory = (v: string) => {
    setCategoryId(v);
    setPage(1);
  };

  /* ── Status icon ── */
  function StatusIcon({ post }: { post: Post }) {
    if (post.is_pinned)
      return <Pin size={16} className="text-error" />;
    if (post.is_featured)
      return <Flame size={16} className="text-orange-500" />;
    return <MessageCircle size={16} className="text-text-muted" />;
  }

  /* ── Filter button ── */
  const filterBtns: { key: FilterType; label: string }[] = [
    { key: "all", label: "全部" },
    { key: "pinned", label: "📌 置顶" },
    { key: "featured", label: "🔥 精华" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-3">
          📋 社群动态
        </h1>
        <p className="text-text-secondary max-w-xl mx-auto">
          实时了解社群最新讨论，加入感兴趣的话题
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        {/* Left: filter buttons */}
        <div className="flex items-center gap-2">
          {filterBtns.map((btn) => (
            <button
              key={btn.key}
              onClick={() => changeFilter(btn.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === btn.key
                  ? "bg-primary text-text-inverse"
                  : "bg-surface text-text-secondary border border-border hover:bg-surface-hover"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Right: category dropdown + 发新帖 */}
        <div className="flex items-center gap-2">
          <select
            value={categoryId}
            onChange={(e) => changeCategory(e.target.value)}
            className="px-4 py-2 text-sm rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">全部板块</option>
            {categories.map((cat) => (
              <option key={cat.id} value={String(cat.id)}>
                {cat.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleNewPost}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors shrink-0"
          >
            <PenSquare size={15} />
            发新帖
          </button>
        </div>
      </div>

      {/* 板块选择弹窗 */}
      {showCatPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCatPicker(false)}>
          <div className="bg-surface rounded-2xl shadow-xl p-6 w-80 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-lg font-semibold text-text-primary mb-4">选择发帖板块</h3>
            <div className="space-y-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setShowCatPicker(false); router.push(`/community/${cat.id}/new-post`); }}
                  className="w-full text-left px-4 py-3 rounded-xl border border-border hover:bg-accent-light/40 hover:border-primary/30 transition-colors"
                >
                  <span className="text-sm font-medium text-text-primary">{cat.name}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowCatPicker(false)} className="mt-4 w-full text-sm text-text-muted hover:text-text-secondary py-2">取消</button>
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-primary-dark text-text-inverse">
              <th className="w-12 px-3 py-3 text-center font-medium">状态</th>
              <th className="px-4 py-3 text-left font-medium">标题</th>
              <th className="w-24 px-3 py-3 text-center font-medium">板块</th>
              <th className="w-20 px-3 py-3 text-center font-medium">作者</th>
              <th className="w-28 px-3 py-3 text-center font-medium">
                回复/浏览
              </th>
              <th className="w-28 px-3 py-3 text-center font-medium">
                最后回复
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-text-muted">
                  加载中…
                </td>
              </tr>
            ) : posts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-text-muted">
                  暂无帖子
                </td>
              </tr>
            ) : (
              posts.map((post, idx) => (
                <tr
                  key={post.id}
                  className={`border-b border-border-light hover:bg-surface-hover transition-colors ${
                    idx % 2 === 0 ? "bg-surface" : "bg-bg"
                  }`}
                >
                  {/* Status */}
                  <td className="px-3 py-3 text-center">
                    <StatusIcon post={post} />
                  </td>

                  {/* Title */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/community/${post.category_id}/post/${post.id}`}
                      className="text-text-primary hover:text-primary font-medium transition-colors line-clamp-1"
                    >
                      {post.is_pinned === 1 && (
                        <span className="inline-flex items-center gap-0.5 mr-1.5 px-1.5 py-0.5 text-[10px] font-bold text-error bg-error/10 rounded align-middle">
                          置顶
                        </span>
                      )}
                      {post.is_featured === 1 && (
                        <span className="inline-flex items-center gap-0.5 mr-1.5 px-1.5 py-0.5 text-[10px] font-bold text-orange-600 bg-orange-50 rounded align-middle">
                          精华
                        </span>
                      )}
                      {post.title}
                    </Link>
                  </td>

                  {/* Category */}
                  <td className="px-3 py-3 text-center">
                    <Link
                      href={`/community/${post.category_id}`}
                      className="inline-block px-2 py-0.5 text-xs rounded whitespace-nowrap"
                      style={{
                        color: post.category_color || "#8B6F47",
                        backgroundColor: `${post.category_color || "#8B6F47"}15`,
                      }}
                    >
                      {post.category_name}
                    </Link>
                  </td>

                  {/* Author */}
                  <td className="px-3 py-3 text-center text-text-secondary text-xs whitespace-nowrap">
                    {post.author_name}
                  </td>

                  {/* Reply / View */}
                  <td className="px-3 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-xs text-text-muted mr-2">
                      <MessageCircle size={12} />
                      {post.comment_count}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                      <Eye size={12} />
                      {post.view_count}
                    </span>
                  </td>

                  {/* Last reply */}
                  <td className="px-3 py-3 text-center text-xs text-text-muted whitespace-nowrap">
                    {relativeTime(post.last_reply_time)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="card p-8 text-center text-text-muted">加载中…</div>
        ) : posts.length === 0 ? (
          <div className="card p-8 text-center text-text-muted">暂无帖子</div>
        ) : (
          posts.map((post) => (
            <Link
              key={post.id}
              href={`/community/${post.category_id}/post/${post.id}`}
              className="block card px-4 py-3 hover:shadow-card-hover transition-shadow"
            >
              {/* Top row: badges */}
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                {post.is_pinned === 1 && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold text-error bg-error/10 rounded">
                    <Pin size={10} />
                    置顶
                  </span>
                )}
                {post.is_featured === 1 && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold text-orange-600 bg-orange-50 rounded">
                    <Flame size={10} />
                    精华
                  </span>
                )}
                <span
                  className="px-1.5 py-0.5 text-[10px] rounded"
                  style={{
                    color: post.category_color || "#8B6F47",
                    backgroundColor: `${post.category_color || "#8B6F47"}15`,
                  }}
                >
                  {post.category_name}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-medium text-text-primary leading-snug line-clamp-2">
                {post.title}
              </h3>

              {/* Meta */}
              <div className="flex items-center gap-3 mt-2 text-[11px] text-text-muted">
                <span>{post.author_name}</span>
                <span className="inline-flex items-center gap-0.5">
                  <MessageCircle size={11} />
                  {post.comment_count}
                </span>
                <span className="inline-flex items-center gap-0.5">
                  <Eye size={11} />
                  {post.view_count}
                </span>
                <span className="ml-auto">
                  {relativeTime(post.last_reply_time)}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text-secondary hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={14} />
            上一页
          </button>

          <span className="px-4 py-2 text-sm text-text-secondary">
            第 {page} / {totalPages} 页（共 {total} 帖）
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text-secondary hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            下一页
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
