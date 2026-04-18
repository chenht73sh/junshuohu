import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { addPoints } from "@/lib/points";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const categoryId = parseInt(id, 10);
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: "无效的板块ID" }, { status: 400 });
    }

    const db = await initializeDatabase();

    // Check category exists
    const catResult = await db.execute({
      sql: "SELECT * FROM categories WHERE id = ?",
      args: [categoryId],
    });
    if (catResult.rows.length === 0) {
      return NextResponse.json({ error: "板块不存在" }, { status: 404 });
    }

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

    return NextResponse.json({ category: catResult.rows[0], posts: postsResult.rows });
  } catch (error) {
    console.error("Failed to fetch posts:", error);
    return NextResponse.json(
      { error: "获取帖子列表失败" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const categoryId = parseInt(id, 10);
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: "无效的板块ID" }, { status: 400 });
    }

    // Verify auth
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "登录已过期，请重新登录" }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, images, attachments, video_url } = body as {
      title: string;
      content: string;
      images?: { filename: string; originalName: string; filePath: string; fileSize: number }[];
      attachments?: { filename: string; originalName: string; filePath: string; fileSize: number; fileType: string }[];
      video_url?: string;
    };

    if (!title || !content) {
      return NextResponse.json({ error: "标题和内容不能为空" }, { status: 400 });
    }

    if (title.length > 100) {
      return NextResponse.json({ error: "标题不能超过100个字符" }, { status: 400 });
    }

    const db = await initializeDatabase();

    // Check category exists
    const catResult = await db.execute({
      sql: "SELECT id FROM categories WHERE id = ?",
      args: [categoryId],
    });
    if (catResult.rows.length === 0) {
      return NextResponse.json({ error: "板块不存在" }, { status: 404 });
    }

    const result = await db.execute({
      sql: `INSERT INTO posts (title, content, author_id, category_id, video_url) VALUES (?, ?, ?, ?, ?)`,
      args: [title, content, payload.userId, categoryId, video_url || null],
    });

    const postId = result.lastInsertRowid!;

    // Insert images
    if (images && images.length > 0) {
      const imgStmts = images.map((img) => ({
        sql: `INSERT INTO post_images (post_id, filename, original_name, file_path, file_size) VALUES (?, ?, ?, ?, ?)`,
        args: [postId, img.filename, img.originalName, img.filePath, img.fileSize],
      }));
      await db.batch(imgStmts, "write");
    }

    // Insert attachments
    if (attachments && attachments.length > 0) {
      const attStmts = attachments.map((att) => ({
        sql: `INSERT INTO post_attachments (post_id, filename, original_name, file_path, file_size, file_type) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [postId, att.filename, att.originalName, att.filePath, att.fileSize, att.fileType],
      }));
      await db.batch(attStmts, "write");
    }

    const postResult = await db.execute({
      sql: `SELECT p.*, u.display_name as author_name
      FROM posts p JOIN users u ON p.author_id = u.id
      WHERE p.id = ?`,
      args: [postId],
    });

    // Award points for creating a post
    await addPoints(payload.userId, 20, "post_create", `发帖：${title}`, Number(postId), "post");

    return NextResponse.json({ post: postResult.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Failed to create post:", error);
    return NextResponse.json(
      { error: "发帖失败" },
      { status: 500 }
    );
  }
}
