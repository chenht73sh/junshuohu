export const dynamic = "force-dynamic";

import { initializeDatabase } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, Pin, Calendar, User, Tag } from "lucide-react";
import { notFound } from "next/navigation";

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
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const announcementId = parseInt(id, 10);
  if (isNaN(announcementId)) notFound();

  const db = await initializeDatabase();

  const result = await db.execute({
    sql: `SELECT a.*,
      u.display_name as author_name,
      c.name as category_name,
      c.color as category_color
    FROM announcements a
    JOIN users u ON a.author_id = u.id
    LEFT JOIN categories c ON a.category_id = c.id
    WHERE a.id = ?`,
    args: [announcementId],
  });

  if (result.rows.length === 0) notFound();
  const announcement = result.rows[0] as unknown as AnnouncementRow;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* Back */}
      <Link
        href="/announcements"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        返回公告列表
      </Link>

      <article className="card overflow-hidden">
        {/* Top color bar */}
        <div className="h-1.5 bg-primary" />

        <div className="p-6 sm:p-8">
          {/* Tags */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {announcement.is_pinned === 1 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-error bg-error/10 rounded-md">
                <Pin size={10} />
                置顶
              </span>
            )}
            {announcement.category_name && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md"
                style={{
                  color: announcement.category_color || "#8B6F47",
                  backgroundColor: `${announcement.category_color || "#8B6F47"}15`,
                }}
              >
                <Tag size={10} />
                {announcement.category_name}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="font-serif text-2xl sm:text-3xl font-bold mb-4">
            {announcement.title}
          </h1>

          {/* Meta */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border-light text-sm text-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <User size={14} />
              {announcement.author_name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={14} />
              {formatDate(announcement.created_at)}
            </span>
          </div>

          {/* Image */}
          {announcement.image_url && (
            <div className="mb-6 rounded-lg overflow-hidden border border-border-light">
              <img
                src={announcement.image_url}
                alt={announcement.title}
                className="w-full max-h-[500px] object-contain bg-bg"
              />
            </div>
          )}

          {/* Content */}
          <div className="prose-warm text-text-primary leading-relaxed whitespace-pre-wrap">
            {announcement.content}
          </div>
        </div>
      </article>
    </div>
  );
}
