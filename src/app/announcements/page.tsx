import { initializeDatabase } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, Pin, Calendar, Tag } from "lucide-react";

interface AnnouncementRow {
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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "Z");
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function AnnouncementsPage() {
  const db = initializeDatabase();

  const announcements = db
    .prepare(
      `SELECT a.*,
        u.display_name as author_name,
        c.name as category_name,
        c.color as category_color
      FROM announcements a
      JOIN users u ON a.author_id = u.id
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE a.expire_at IS NULL OR a.expire_at > datetime('now')
      ORDER BY a.is_pinned DESC, a.created_at DESC`
    )
    .all() as AnnouncementRow[];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        返回首页
      </Link>

      <div className="mb-8">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold mb-2">
          📢 论坛公告
        </h1>
        <p className="text-text-secondary text-sm">
          社群最新通知和重要信息
        </p>
      </div>

      {announcements.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-text-muted text-lg mb-1">暂无公告</p>
          <p className="text-text-muted text-sm">管理员还没有发布任何公告</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => (
            <Link
              key={ann.id}
              href={`/announcements/${ann.id}`}
              className="block border border-border rounded-lg hover:border-primary/30 hover:shadow-card transition-all overflow-hidden bg-surface"
            >
              <div className="flex flex-col sm:flex-row">
                {/* Image thumbnail */}
                {ann.image_url && (
                  <div className="sm:w-48 sm:h-32 h-40 shrink-0 overflow-hidden bg-bg">
                    <img
                      src={ann.image_url}
                      alt={ann.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 p-4 sm:p-5 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {ann.is_pinned === 1 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-error bg-error/10 rounded">
                        <Pin size={10} />
                        置顶
                      </span>
                    )}
                    {ann.category_name && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded"
                        style={{
                          color: ann.category_color || "#8B6F47",
                          backgroundColor: `${ann.category_color || "#8B6F47"}15`,
                        }}
                      >
                        <Tag size={10} />
                        {ann.category_name}
                      </span>
                    )}
                  </div>

                  <h2 className="font-medium text-text-primary text-base mb-2 line-clamp-1">
                    {ann.title}
                  </h2>

                  <p className="text-sm text-text-muted line-clamp-2 mb-3">
                    {ann.content}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    <span>{ann.author_name}</span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={11} />
                      {formatDate(ann.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
