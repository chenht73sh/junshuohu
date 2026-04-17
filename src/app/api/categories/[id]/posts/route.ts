import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

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

    const db = initializeDatabase();

    // Check category exists
    const category = db
      .prepare("SELECT * FROM categories WHERE id = ?")
      .get(categoryId);
    if (!category) {
      return NextResponse.json({ error: "板块不存在" }, { status: 404 });
    }

    const posts = db
      .prepare(
        `SELECT p.*, 
          u.display_name as author_name,
          u.avatar_url as author_avatar,
          (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
        FROM posts p
        JOIN users u ON p.author_id = u.id
        WHERE p.category_id = ?
        ORDER BY p.is_pinned DESC, p.created_at DESC`
      )
      .all(categoryId);

    return NextResponse.json({ category, posts });
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

    const db = initializeDatabase();

    // Check category exists
    const category = db
      .prepare("SELECT id FROM categories WHERE id = ?")
      .get(categoryId);
    if (!category) {
      return NextResponse.json({ error: "板块不存在" }, { status: 404 });
    }

    const result = db
      .prepare(
        `INSERT INTO posts (title, content, author_id, category_id, video_url) VALUES (?, ?, ?, ?, ?)`
      )
      .run(title, content, payload.userId, categoryId, video_url || null);

    const postId = result.lastInsertRowid as number;

    // Insert images
    if (images && images.length > 0) {
      const imgStmt = db.prepare(
        `INSERT INTO post_images (post_id, filename, original_name, file_path, file_size) VALUES (?, ?, ?, ?, ?)`
      );
      for (const img of images) {
        imgStmt.run(postId, img.filename, img.originalName, img.filePath, img.fileSize);
      }
    }

    // Insert attachments
    if (attachments && attachments.length > 0) {
      const attStmt = db.prepare(
        `INSERT INTO post_attachments (post_id, filename, original_name, file_path, file_size, file_type) VALUES (?, ?, ?, ?, ?, ?)`
      );
      for (const att of attachments) {
        attStmt.run(postId, att.filename, att.originalName, att.filePath, att.fileSize, att.fileType);
      }
    }

    const post = db
      .prepare(
        `SELECT p.*, u.display_name as author_name
        FROM posts p JOIN users u ON p.author_id = u.id
        WHERE p.id = ?`
      )
      .get(postId);

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("Failed to create post:", error);
    return NextResponse.json(
      { error: "发帖失败" },
      { status: 500 }
    );
  }
}
