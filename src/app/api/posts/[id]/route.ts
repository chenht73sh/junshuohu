import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
      return NextResponse.json({ error: "无效的帖子ID" }, { status: 400 });
    }

    const db = initializeDatabase();

    // Increment view count
    db.prepare("UPDATE posts SET view_count = view_count + 1 WHERE id = ?").run(
      postId
    );

    const post = db
      .prepare(
        `SELECT p.*, 
          u.display_name as author_name,
          u.avatar_url as author_avatar,
          u.bio as author_bio,
          c.name as category_name,
          c.color as category_color,
          (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
        FROM posts p
        JOIN users u ON p.author_id = u.id
        JOIN categories c ON p.category_id = c.id
        WHERE p.id = ?`
      )
      .get(postId);

    if (!post) {
      return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
    }

    // Fetch images and attachments
    const images = db
      .prepare("SELECT * FROM post_images WHERE post_id = ? ORDER BY id ASC")
      .all(postId);

    const attachments = db
      .prepare("SELECT * FROM post_attachments WHERE post_id = ? ORDER BY id ASC")
      .all(postId);

    return NextResponse.json({ post, images, attachments });
  } catch (error) {
    console.error("Failed to fetch post:", error);
    return NextResponse.json(
      { error: "获取帖子详情失败" },
      { status: 500 }
    );
  }
}
