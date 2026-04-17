"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Pin,
  Star,
  MessageCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

interface Post {
  id: number;
  title: string;
  content: string;
  author_id: number;
  category_id: number;
  is_pinned: number;
  is_featured: number;
  view_count: number;
  created_at: string;
  updated_at: string;
  author_name: string;
  category_name: string;
  category_color: string;
  comment_count: number;
  last_reply_time: string;
}

interface Category {
  id: number;
  name: string;
  color: string;
}

interface PostsResponse {
  posts: Post[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type FilterType = "all" | "pinned" | "featured";

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr + "Z");
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days === 1) return "昨天";
  if (days < 7) return `${days} 天前`;
  if (days < 30) return `${Math.floor(days / 7)} 周前`;
  return date.toLocaleDateString("zh-CN");
}

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "pinned", label: "📌 置顶" },
  { key: "featured", label: "🔥 精华" },
];

export default function PostsTable({
  categories,
}: {
  categories: Category[];
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        filter,
      });
      if (selectedCategory !== "all") {
        params.set("category", selectedCategory);
      }
      const res = await fetch(`/api/posts?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data: PostsResponse = await res.json();
      setPosts(data.posts);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      console.error("Failed to fetch posts:", err);
    } finally {
      setLoading(false);
    }
  }, [page, filter, selectedCategory]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Reset page when filter/category changes
  useEffect(() => {
    setPage(1);
  }, [filter, selectedCategory]);

  function StatusIcon({ post }: { post: Post }) {
    if (post.is_pinned) {
      return (
        <span className="text-error" title="置顶">
          <Pin size={16} />
        </span>
      );
    }
    if (post.is_featured) {
      return (
        <span className="text-warning" title="精华">
          <Star size={16} />
        </span>
      );
    }
    return (
      <span className="text-text-muted" title="普通帖">
        <MessageCircle size={16} />
      </span>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Filter Bar */}
      <div className="px-4 sm:px-6 py-4 border-b border-border-light bg-surface-hover/50">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Filter tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  filter === opt.key
                    ? "bg-primary text-text-inverse"
                    : "bg-surface text-text-secondary hover:bg-accent-light hover:text-text-primary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Category select */}
          <div className="sm:ml-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">全部板块</option>
              {categories.map((cat) => (
                <option key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-primary" />
          <span className="ml-2 text-text-muted text-sm">加载中...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && posts.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-text-muted text-lg mb-1">暂无帖子</p>
          <p className="text-text-muted text-sm">
            换个筛选条件试试？✨
          </p>
        </div>
      )}

      {/* Desktop Table */}
      {!loading && posts.length > 0 && (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-primary-dark text-text-inverse text-sm">
                  <th className="px-4 py-3 text-center w-12">状态</th>
                  <th className="px-4 py-3 text-left">标题</th>
                  <th className="px-4 py-3 text-left w-28">板块</th>
                  <th className="px-4 py-3 text-left w-24">作者</th>
                  <th className="px-4 py-3 text-center w-28">回复/浏览</th>
                  <th className="px-4 py-3 text-right w-28">最后回复</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post, idx) => (
                  <tr
                    key={post.id}
                    className={`border-b border-border-light transition-colors hover:bg-accent-light/60 ${
                      post.is_pinned
                        ? "bg-warning/8"
                        : idx % 2 === 0
                        ? "bg-surface"
                        : "bg-bg"
                    }`}
                  >
                    <td className="px-4 py-3 text-center">
                      <StatusIcon post={post} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/community/${post.category_id}/post/${post.id}`}
                        className="text-text-primary hover:text-primary font-medium transition-colors line-clamp-1"
                      >
                        {post.is_featured === 1 && (
                          <span className="mr-1">🔥</span>
                        )}
                        {post.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-block px-2 py-0.5 text-xs rounded-md font-medium"
                        style={{
                          color: post.category_color || "#8B6F47",
                          backgroundColor: `${post.category_color || "#8B6F47"}18`,
                        }}
                      >
                        {post.category_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary truncate">
                      {post.author_name}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-3 text-xs text-text-muted">
                        <span className="inline-flex items-center gap-0.5">
                          <MessageCircle size={12} />
                          {post.comment_count}
                        </span>
                        <span className="inline-flex items-center gap-0.5">
                          <Eye size={12} />
                          {post.view_count}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-text-muted whitespace-nowrap">
                      {formatRelativeTime(post.last_reply_time)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden divide-y divide-border-light">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/community/${post.category_id}/post/${post.id}`}
                className="block px-4 py-3 hover:bg-accent-light/60 transition-colors"
              >
                <div
                  className={`${post.is_pinned ? "bg-warning/8 -mx-4 px-4 py-3 -my-3" : ""}`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <StatusIcon post={post} />
                    <span
                      className="px-2 py-0.5 text-xs rounded-md font-medium"
                      style={{
                        color: post.category_color || "#8B6F47",
                        backgroundColor: `${post.category_color || "#8B6F47"}18`,
                      }}
                    >
                      {post.category_name}
                    </span>
                  </div>
                  <h4 className="text-sm font-medium text-text-primary mb-2 line-clamp-2">
                    {post.is_featured === 1 && (
                      <span className="mr-1">🔥</span>
                    )}
                    {post.title}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-text-muted">
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
                      {formatRelativeTime(post.last_reply_time)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="px-4 sm:px-6 py-4 border-t border-border-light flex items-center justify-between bg-surface-hover/30">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-border bg-surface text-text-secondary hover:bg-accent-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={14} />
            上一页
          </button>
          <span className="text-sm text-text-muted">
            第 {page} 页 / 共 {totalPages} 页（{total} 条）
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-border bg-surface text-text-secondary hover:bg-accent-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            下一页
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
