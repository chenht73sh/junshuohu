export const dynamic = "force-dynamic";

import { initializeDatabase } from "@/lib/db";
import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  MessageCircle,
  Pin,
  Star,
  Download,
  FileText,
  FileSpreadsheet,
  Presentation,
  FileArchive,
  File,
  Video,
  ExternalLink,
} from "lucide-react";
import { notFound } from "next/navigation";
import CommentSection from "./CommentSection";
import PostImageGallery from "./PostImageGallery";
import SendMessageButton from "./SendMessageButton";
import { marked } from "marked";

// Configure marked for server-side rendering
marked.setOptions({ breaks: true, gfm: true });

function renderPostContent(text: string): string {
  const html = marked.parse(text) as string;
  // Basic XSS sanitization
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<[^>]+ on\w+="[^"]*"/gi, "")
    .replace(/<[^>]+ on\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

interface PostRow {
  id: number;
  title: string;
  content: string;
  author_id: number;
  category_id: number;
  is_pinned: number;
  is_featured: number;
  view_count: number;
  video_url: string | null;
  created_at: string;
  updated_at: string;
  author_name: string;
  author_avatar: string | null;
  author_bio: string | null;
  author_role: string;
  category_name: string;
  category_color: string;
  comment_count: number;
}

interface ImageRow {
  id: number;
  post_id: number;
  filename: string;
  original_name: string;
  file_path: string;
  file_size: number;
  created_at: string;
}

interface AttachmentRow {
  id: number;
  post_id: number;
  filename: string;
  original_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  created_at: string;
}

interface CommentRow {
  id: number;
  content: string;
  author_id: number;
  post_id: number;
  parent_id: number | null;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
  author_role: string;
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getFileIcon(mimeType: string) {
  if (mimeType.includes("pdf"))
    return <FileText size={20} className="text-red-500 shrink-0" />;
  if (mimeType.includes("word") || mimeType.includes("msword"))
    return <FileText size={20} className="text-blue-500 shrink-0" />;
  if (mimeType.includes("sheet") || mimeType.includes("excel"))
    return <FileSpreadsheet size={20} className="text-green-500 shrink-0" />;
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return <Presentation size={20} className="text-orange-500 shrink-0" />;
  if (mimeType.includes("zip"))
    return <FileArchive size={20} className="text-yellow-600 shrink-0" />;
  return <File size={20} className="text-gray-400 shrink-0" />;
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string; postId: string }>;
}) {
  const { id, postId: postIdStr } = await params;
  const categoryId = parseInt(id, 10);
  const postId = parseInt(postIdStr, 10);
  if (isNaN(categoryId) || isNaN(postId)) notFound();

  const db = await initializeDatabase();

  // Increment view count
  await db.execute({
    sql: "UPDATE posts SET view_count = view_count + 1 WHERE id = ?",
    args: [postId],
  });

  const postResult = await db.execute({
    sql: `SELECT p.*, 
      u.display_name as author_name,
      u.avatar_url as author_avatar,
      u.bio as author_bio,
      u.role as author_role,
      c.name as category_name,
      c.color as category_color,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
    FROM posts p
    JOIN users u ON p.author_id = u.id
    JOIN categories c ON p.category_id = c.id
    WHERE p.id = ? AND p.category_id = ?`,
    args: [postId, categoryId],
  });

  if (postResult.rows.length === 0) notFound();
  const post = postResult.rows[0] as unknown as PostRow;

  const imagesResult = await db.execute({
    sql: "SELECT * FROM post_images WHERE post_id = ? ORDER BY id ASC",
    args: [postId],
  });
  const images = imagesResult.rows as unknown as ImageRow[];

  const attachmentsResult = await db.execute({
    sql: "SELECT * FROM post_attachments WHERE post_id = ? ORDER BY id ASC",
    args: [postId],
  });
  const attachments = attachmentsResult.rows as unknown as AttachmentRow[];

  const commentsResult = await db.execute({
    sql: `SELECT cm.*, 
      u.display_name as author_name,
      u.avatar_url as author_avatar,
      u.role as author_role
    FROM comments cm
    JOIN users u ON cm.author_id = u.id
    WHERE cm.post_id = ?
    ORDER BY cm.created_at ASC`,
    args: [postId],
  });
  const comments = commentsResult.rows as unknown as CommentRow[];

  const categoryColor = post.category_color || "#8B6F47";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* Back link */}
      <Link
        href={`/community/${categoryId}`}
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        返回「{post.category_name}」
      </Link>

      {/* Post Title & Tags */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span
            className="px-2.5 py-1 text-xs rounded-md"
            style={{
              color: categoryColor,
              backgroundColor: `${categoryColor}15`,
            }}
          >
            {post.category_name}
          </span>
          {post.is_pinned === 1 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-error bg-error/10 rounded-md">
              <Pin size={10} />
              置顶
            </span>
          )}
          {post.is_featured === 1 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-warning bg-warning/10 rounded-md">
              <Star size={10} />
              精华
            </span>
          )}
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold">
          {post.title}
        </h1>
        <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
          <span className="inline-flex items-center gap-1">
            <Eye size={12} />
            {post.view_count}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle size={12} />
            {post.comment_count}
          </span>
        </div>
      </div>

      {/* Post as "楼主" floor */}
      <article className="border border-border rounded-lg overflow-hidden mb-8">
        <div className="flex flex-col sm:flex-row">
          {/* Left: Author info */}
          <div className="sm:w-36 shrink-0 bg-accent-light/30 px-4 py-3 sm:py-4 sm:text-center sm:border-r sm:border-border-light">
            <div className="flex sm:flex-col items-center sm:items-center gap-2.5 sm:gap-1.5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm sm:text-base font-semibold text-primary shrink-0">
                {post.author_name.charAt(0)}
              </div>
              <div className="sm:text-center">
                <p className="text-sm font-medium text-text-primary leading-tight">
                  {post.author_name}
                </p>
                {post.author_role === "admin" && (
                  <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-error/10 text-error rounded">
                    管理员
                  </span>
                )}
                {post.author_role === "moderator" && (
                  <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded">
                    版主
                  </span>
                )}
                <SendMessageButton authorId={post.author_id} />
              </div>
            </div>
          </div>

          {/* Right: Floor label + time + content */}
          <div className="flex-1 min-w-0 px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-border-light">
              <span className="text-xs font-medium text-text-inverse bg-primary px-2 py-0.5 rounded">
                楼主
              </span>
              <span className="text-xs text-text-muted">
                {formatDate(post.created_at)}
              </span>
            </div>

            {/* Content — rendered as Markdown HTML */}
            <div
              className="prose-warm text-text-primary leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderPostContent(post.content) }}
            />

            {/* Images */}
            {images.length > 0 && (
              <div className="mt-6 pt-4 border-t border-border-light">
                <PostImageGallery
                  images={images.map((img) => ({
                    filePath: img.file_path,
                    originalName: img.original_name,
                  }))}
                />
              </div>
            )}

            {/* Video Link */}
            {post.video_url && (
              <div className="mt-6 pt-4 border-t border-border-light">
                <a
                  href={post.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 px-4 py-3 bg-bg border border-border-light rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors group"
                >
                  <Video size={20} className="text-primary shrink-0" />
                  <span className="text-sm text-text-primary group-hover:text-primary transition-colors truncate max-w-md">
                    {post.video_url}
                  </span>
                  <ExternalLink size={14} className="text-text-muted shrink-0" />
                </a>
              </div>
            )}

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="mt-6 pt-4 border-t border-border-light">
                <h3 className="text-sm font-medium text-text-secondary mb-3">
                  📎 附件（{attachments.length}）
                </h3>
                <div className="space-y-2">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-3 px-4 py-3 bg-bg border border-border-light rounded-lg"
                    >
                      {getFileIcon(att.file_type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary truncate">
                          {att.original_name}
                        </p>
                        <p className="text-xs text-text-muted">
                          {formatFileSize(att.file_size)}
                        </p>
                      </div>
                      <a
                        href={`${att.file_path}?download=1`}
                        download={att.original_name}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-colors"
                      >
                        <Download size={12} />
                        下载
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </article>

      {/* Comments */}
      <CommentSection postId={postId} initialComments={comments} />
    </div>
  );
}
