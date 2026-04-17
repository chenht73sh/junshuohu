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
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
      return NextResponse.json({ error: "无效的帖子ID" }, { status: 400 });
    }

    const db = initializeDatabase();

    const comments = db
      .prepare(
        `SELECT cm.*, 
          u.display_name as author_name,
          u.avatar_url as author_avatar,
          u.role as author_role
        FROM comments cm
        JOIN users u ON cm.author_id = u.id
        WHERE cm.post_id = ?
        ORDER BY cm.created_at ASC`
      )
      .all(postId);

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Failed to fetch comments:", error);
    return NextResponse.json(
      { error: "获取评论失败" },
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
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
      return NextResponse.json({ error: "无效的帖子ID" }, { status: 400 });
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
    const { content, parent_id } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "评论内容不能为空" }, { status: 400 });
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: "评论不能超过2000个字符" }, { status: 400 });
    }

    const db = initializeDatabase();

    // Check post exists
    const post = db.prepare("SELECT id FROM posts WHERE id = ?").get(postId);
    if (!post) {
      return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
    }

    const result = db
      .prepare(
        `INSERT INTO comments (content, author_id, post_id, parent_id) VALUES (?, ?, ?, ?)`
      )
      .run(content, payload.userId, postId, parent_id || null);

    const comment = db
      .prepare(
        `SELECT cm.*, u.display_name as author_name, u.avatar_url as author_avatar, u.role as author_role
        FROM comments cm JOIN users u ON cm.author_id = u.id
        WHERE cm.id = ?`
      )
      .get(result.lastInsertRowid);

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("Failed to create comment:", error);
    return NextResponse.json(
      { error: "评论失败" },
      { status: 500 }
    );
  }
}
