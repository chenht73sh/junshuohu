"use client";

import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";

interface Comment {
  id: number;
  content: string;
  author_id: number;
  post_id: number;
  parent_id: number | null;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
  author_role?: string;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr + "Z");
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getFloorLabel(index: number): string {
  switch (index) {
    case 0:
      return "沙发";
    case 1:
      return "板凳";
    case 2:
      return "地板";
    default:
      return `第${index + 1}楼`;
  }
}

function getRoleBadge(role?: string) {
  if (role === "admin") {
    return (
      <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-error/10 text-error rounded">
        管理员
      </span>
    );
  }
  if (role === "moderator") {
    return (
      <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded">
        版主
      </span>
    );
  }
  return null;
}

export default function CommentSection({
  postId,
  initialComments,
}: {
  postId: number;
  initialComments: Comment[];
}) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("请先登录后再评论");
        setSubmitting(false);
        return;
      }

      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "评论失败");
        setSubmitting(false);
        return;
      }

      setComments((prev) => [...prev, data.comment]);
      setContent("");
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Comment count header */}
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle size={20} className="text-primary" />
        <h2 className="font-serif text-xl font-bold">
          评论 ({comments.length})
        </h2>
      </div>

      {/* Floor-style comment list */}
      {comments.length > 0 ? (
        <div className="mb-8 border border-border rounded-lg overflow-hidden">
          {comments.map((comment, index) => (
            <div
              key={comment.id}
              className={`flex flex-col sm:flex-row ${
                index > 0 ? "border-t border-border" : ""
              }`}
            >
              {/* Left: Author info */}
              <div className="sm:w-36 shrink-0 bg-accent-light/30 px-4 py-3 sm:py-4 sm:text-center sm:border-r sm:border-border-light">
                <div className="flex sm:flex-col items-center sm:items-center gap-2.5 sm:gap-1.5">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm sm:text-base font-semibold text-primary shrink-0">
                    {comment.author_name.charAt(0)}
                  </div>
                  <div className="sm:text-center">
                    <p className="text-sm font-medium text-text-primary leading-tight">
                      {comment.author_name}
                    </p>
                    <div className="mt-0.5">
                      {getRoleBadge(comment.author_role)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Floor number + time + content */}
              <div className="flex-1 min-w-0 px-4 py-3 sm:py-4">
                <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-border-light">
                  <span className="text-xs font-medium text-primary bg-primary/8 px-2 py-0.5 rounded">
                    {getFloorLabel(index)}
                  </span>
                  <span className="text-xs text-text-muted">
                    {formatTime(comment.created_at)}
                  </span>
                </div>
                <div className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                  {comment.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-border rounded-lg p-8 text-center mb-8 bg-surface">
          <p className="text-text-muted">还没有评论，来坐沙发吧 💬</p>
        </div>
      )}

      {/* Comment form */}
      <div className="border border-border rounded-lg p-5 bg-surface">
        <h3 className="font-medium text-sm text-text-primary mb-3">
          发表评论
        </h3>
        <form onSubmit={handleSubmit}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="说说你的想法..."
            rows={3}
            maxLength={2000}
            className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
          />

          {error && (
            <p className="mt-2 text-sm text-error">{error}</p>
          )}

          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-text-muted">
              {content.length}/2000
            </span>
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-text-inverse text-sm font-medium rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={14} />
              {submitting ? "发送中..." : "发表评论"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
