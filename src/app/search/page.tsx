"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageCircle,
  Pin,
  Star,
} from "lucide-react";

/* ── Types ── */
interface SearchResult {
  id: number;
  title: string;
  content: string;
  author_username: string;
  author_display_name: string;
  category_id: number;
  category_name: string;
  category_color: string | null;
  is_pinned: number;
  is_featured: number;
  view_count: number;
  comment_count: number;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
  color: string | null;
}

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

function highlight(text: string, keyword: string): (string | React.ReactElement)[] {
  if (!keyword) return [text];
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === keyword.toLowerCase() ? (
      <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

/** 在摘要中找到关键词附近的文字片段（最多160字） */
function excerptAround(text: string, keyword: string, maxLen = 160): string {
  if (!keyword) return text.slice(0, maxLen);
  const lower = text.toLowerCase();
  const idx = lower.indexOf(keyword.toLowerCase());
  if (idx === -1) return text.slice(0, maxLen);
  const start = Math.max(0, idx - 60);
  const end = Math.min(text.length, idx + keyword.length + 100);
  let excerpt = text.slice(start, end);
  if (start > 0) excerpt = "…" + excerpt;
  if (end < text.length) excerpt = excerpt + "…";
  return excerpt;
}

/* ── Inner page (needs useSearchParams) ── */
function SearchPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const q = searchParams.get("q") ?? "";
  const pageParam = parseInt(searchParams.get("page") ?? "1");
  const categoryParam = searchParams.get("categoryId") ?? "";

  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(q);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);

  /* Fetch categories */
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        if (data.categories) setCategories(data.categories);
      })
      .catch(() => {});
  }, []);

  /* Sync input to URL q */
  useEffect(() => {
    setInputValue(q);
  }, [q]);

  /* Fetch results */
  const fetchResults = useCallback(async () => {
    if (!q) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ q, page: String(pageParam), limit: "10" });
      if (selectedCategory) params.set("categoryId", selectedCategory);
      const res = await fetch(`/api/search?${params}`);
      if (!res.ok) throw new Error("search failed");
      const data = await res.json();
      setResults(data.results ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      setResults([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [q, pageParam, selectedCategory]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  /* Navigate */
  function navigate(newQ: string, newPage: number, newCat: string) {
    const params = new URLSearchParams();
    if (newQ) params.set("q", newQ);
    if (newPage > 1) params.set("page", String(newPage));
    if (newCat) params.set("categoryId", newCat);
    router.push(`/search?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!inputValue.trim()) return;
    setSelectedCategory("");
    navigate(inputValue.trim(), 1, "");
  }

  function handleCategoryChange(catId: string) {
    setSelectedCategory(catId);
    navigate(q, 1, catId);
  }

  function handlePageChange(newPage: number) {
    navigate(q, newPage, selectedCategory);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-3">
          🔍 全文搜索
        </h1>
        <p className="text-text-secondary">在社群所有帖子中搜索</p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="输入关键词搜索帖子标题或内容…"
              maxLength={100}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 text-sm font-medium bg-primary text-text-inverse rounded-lg hover:bg-primary-dark transition-colors shrink-0"
          >
            搜索
          </button>
        </div>
      </form>

      {/* Filter row */}
      {q && categories.length > 0 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <span className="text-xs text-text-muted">筛选板块：</span>
          <button
            onClick={() => handleCategoryChange("")}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              !selectedCategory
                ? "bg-primary text-text-inverse border-primary"
                : "border-border text-text-secondary hover:border-primary hover:text-primary"
            }`}
          >
            全部
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(String(cat.id))}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                selectedCategory === String(cat.id)
                  ? "text-text-inverse border-transparent"
                  : "border-border text-text-secondary hover:border-primary hover:text-primary"
              }`}
              style={
                selectedCategory === String(cat.id)
                  ? { backgroundColor: cat.color || "#8B6F47", borderColor: cat.color || "#8B6F47" }
                  : {}
              }
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Result summary */}
      {q && !loading && (
        <p className="text-sm text-text-secondary mb-4">
          搜索「<span className="font-medium text-primary">{q}</span>」，共找到{" "}
          <span className="font-medium text-text-primary">{total}</span> 条结果
          {selectedCategory && categories.find((c) => String(c.id) === selectedCategory) && (
            <span className="ml-1 text-text-muted">
              （
              {categories.find((c) => String(c.id) === selectedCategory)?.name}
              ）
            </span>
          )}
        </p>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-border-light rounded w-3/4 mb-3" />
              <div className="h-3 bg-border-light rounded w-full mb-2" />
              <div className="h-3 bg-border-light rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {!loading && q && results.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-lg font-medium text-text-primary mb-2">
            没有找到相关内容
          </p>
          <p className="text-sm text-text-secondary">
            换个关键词试试？或者{" "}
            <Link href="/community" className="text-primary hover:underline">
              浏览社群动态
            </Link>
          </p>
        </div>
      )}

      {/* Empty state (no query yet) */}
      {!loading && !q && (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-4">🔎</p>
          <p className="text-text-secondary text-sm">在上方输入关键词开始搜索</p>
        </div>
      )}

      {/* Results list */}
      {!loading && results.length > 0 && (
        <div className="space-y-3">
          {results.map((result) => {
            const excerpt = excerptAround(result.content, q);
            return (
              <Link
                key={result.id}
                href={`/community/${result.category_id}/post/${result.id}`}
                className="block card p-5 hover:shadow-card-hover transition-shadow group"
              >
                {/* Badges */}
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  {result.is_pinned === 1 && (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-medium text-error bg-error/10 rounded">
                      <Pin size={10} />
                      置顶
                    </span>
                  )}
                  {result.is_featured === 1 && (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-medium text-warning bg-warning/10 rounded">
                      <Star size={10} />
                      精华
                    </span>
                  )}
                  <span
                    className="px-2 py-0.5 text-xs rounded"
                    style={{
                      color: result.category_color || "#8B6F47",
                      backgroundColor: `${result.category_color || "#8B6F47"}15`,
                    }}
                  >
                    {result.category_name}
                  </span>
                </div>

                {/* Title with highlight */}
                <h3 className="font-medium text-text-primary group-hover:text-primary transition-colors mb-1.5 leading-snug">
                  {highlight(result.title, q)}
                </h3>

                {/* Excerpt with highlight */}
                {excerpt && (
                  <p className="text-sm text-text-secondary leading-relaxed line-clamp-2 mb-3">
                    {highlight(excerpt, q)}
                  </p>
                )}

                {/* Meta */}
                <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap">
                  <span className="font-medium text-text-secondary">
                    {result.author_display_name}
                  </span>
                  <span>@{result.author_username}</span>
                  <span>{relativeTime(result.created_at)}</span>
                  <span className="inline-flex items-center gap-1">
                    <Eye size={11} />
                    {result.view_count}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle size={11} />
                    {result.comment_count}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-center gap-2 mt-8 flex-wrap">
          <button
            onClick={() => handlePageChange(pageParam - 1)}
            disabled={pageParam <= 1}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text-secondary hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={14} />
            上一页
          </button>

          {/* Page number buttons */}
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let pg: number;
            if (totalPages <= 7) {
              pg = i + 1;
            } else if (pageParam <= 4) {
              pg = i + 1;
            } else if (pageParam >= totalPages - 3) {
              pg = totalPages - 6 + i;
            } else {
              pg = pageParam - 3 + i;
            }
            return (
              <button
                key={pg}
                onClick={() => handlePageChange(pg)}
                className={`w-9 h-9 text-sm rounded-lg border transition-colors ${
                  pg === pageParam
                    ? "bg-primary text-text-inverse border-primary"
                    : "border-border bg-surface text-text-secondary hover:bg-surface-hover"
                }`}
              >
                {pg}
              </button>
            );
          })}

          <button
            onClick={() => handlePageChange(pageParam + 1)}
            disabled={pageParam >= totalPages}
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

/* ── Export: wrap in Suspense for useSearchParams ── */
export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 py-14 text-center text-text-muted">
          加载中…
        </div>
      }
    >
      <SearchPageInner />
    </Suspense>
  );
}
