export const dynamic = "force-dynamic";

import { initializeDatabase } from "@/lib/db";
import PostCard from "@/components/PostCard";
import Link from "next/link";
import { ArrowLeft, PenLine } from "lucide-react";
import { notFound } from "next/navigation";

interface CategoryRow {
  id: number;
  name: string;
  description: string | null;
  moderator_name: string | null;
  icon: string | null;
  color: string | null;
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
  created_at: string;
  author_name: string;
  author_avatar: string | null;
  comment_count: number;
}

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const categoryId = parseInt(id, 10);
  if (isNaN(categoryId)) notFound();

  const db = await initializeDatabase();

  const catResult = await db.execute({
    sql: "SELECT * FROM categories WHERE id = ?",
    args: [categoryId],
  });

  if (catResult.rows.length === 0) notFound();
  const category = catResult.rows[0] as unknown as CategoryRow;

  const postsResult = await db.execute({
    sql: `SELECT p.*, 
      u.display_name as author_name,
      u.avatar_url as author_avatar,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
    FROM posts p
    JOIN users u ON p.author_id = u.id
    WHERE p.category_id = ?
    ORDER BY p.is_pinned DESC, p.created_at DESC`,
    args: [categoryId],
  });
  const posts = postsResult.rows as unknown as PostRow[];

  const categoryColor = category.color || "#8B6F47";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* Back link */}
      <Link
        href="/community"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        返回板块列表
      </Link>

      {/* Category header */}
      <div className="card overflow-hidden mb-8">
        <div className="h-2" style={{ backgroundColor: categoryColor }} />
        <div className="p-6 sm:p-8">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold mb-2">
            {category.name}
          </h1>
          {category.moderator_name && (
            <p className="text-sm text-text-muted mb-3">
              主理人：
              <span className="text-text-secondary font-medium">
                {category.moderator_name}
              </span>
            </p>
          )}
          {category.description && (
            <p className="text-text-secondary leading-relaxed">
              {category.description}
            </p>
          )}

          {/* Action bar */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border-light">
            <span className="text-sm text-text-muted">
              共 {posts.length} 篇帖子
            </span>
            <Link
              href={`/community/${category.id}/new-post`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-text-inverse text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors"
            >
              <PenLine size={16} />
              发布新帖
            </Link>
          </div>
        </div>
      </div>

      {/* Posts list */}
      {posts.length > 0 ? (
        <div className="card overflow-hidden">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              id={post.id}
              title={post.title}
              author_name={post.author_name}
              category_id={post.category_id}
              created_at={post.created_at}
              view_count={post.view_count}
              comment_count={post.comment_count}
              is_pinned={post.is_pinned}
              is_featured={post.is_featured}
            />
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <p className="text-text-muted text-lg mb-2">这个板块还没有帖子</p>
          <p className="text-text-muted text-sm mb-6">
            成为第一个在「{category.name}」发帖的人吧 ✨
          </p>
          <Link
            href={`/community/${category.id}/new-post`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-text-inverse text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors"
          >
            <PenLine size={16} />
            发布新帖
          </Link>
        </div>
      )}
    </div>
  );
}
