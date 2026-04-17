import Link from "next/link";
import { MessageCircle, Eye, Pin, Star } from "lucide-react";

interface PostCardProps {
  id: number;
  title: string;
  author_name: string;
  category_id: number;
  category_name?: string;
  category_color?: string;
  created_at: string;
  view_count: number;
  comment_count: number;
  is_pinned: number;
  is_featured: number;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr + "Z");
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 30) return `${days} 天前`;
  return date.toLocaleDateString("zh-CN");
}

export default function PostCard({
  id,
  title,
  author_name,
  category_id,
  category_name,
  category_color,
  created_at,
  view_count,
  comment_count,
  is_pinned,
  is_featured,
}: PostCardProps) {
  return (
    <Link
      href={`/community/${category_id}/post/${id}`}
      className="block group"
    >
      <div className="px-5 py-4 bg-surface hover:bg-surface-hover border-b border-border-light transition-colors">
        <div className="flex items-start gap-3">
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {is_pinned === 1 && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-medium text-error bg-error/10 rounded">
                  <Pin size={10} />
                  置顶
                </span>
              )}
              {is_featured === 1 && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-medium text-warning bg-warning/10 rounded">
                  <Star size={10} />
                  精华
                </span>
              )}
              {category_name && (
                <span
                  className="px-2 py-0.5 text-xs rounded"
                  style={{
                    color: category_color || "#8B6F47",
                    backgroundColor: `${category_color || "#8B6F47"}15`,
                  }}
                >
                  {category_name}
                </span>
              )}
            </div>

            <h3 className="font-medium text-text-primary group-hover:text-primary transition-colors truncate">
              {title}
            </h3>

            <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
              <span>{author_name}</span>
              <span>{formatTime(created_at)}</span>
              <span className="inline-flex items-center gap-1">
                <Eye size={12} />
                {view_count}
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle size={12} />
                {comment_count}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
