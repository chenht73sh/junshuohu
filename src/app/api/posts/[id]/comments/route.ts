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
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
      return NextResponse.json({ error: "无效的帖子ID" }, { status: 400 });
    }

    const db = await initializeDatabase();

    const result = await db.execute({
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

    return NextResponse.json({ comments: result.rows });
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

    const db = await initializeDatabase();

    // 评论频率限制：1分钟内不超过5条
    const oneMinAgo = new Date(Date.now() - 60_000).toISOString();
    const recentComments = await db.execute({
      sql: "SELECT COUNT(*) as cnt FROM comments WHERE author_id = ? AND created_at > ?",
      args: [payload.userId, oneMinAgo],
    });
    if ((recentComments.rows[0].cnt as number) >= 5) {
      return NextResponse.json({ error: "评论过于频繁，请稍后再试" }, { status: 429 });
    }

    // Check post exists
    const postResult = await db.execute({
      sql: "SELECT id FROM posts WHERE id = ?",
      args: [postId],
    });
    if (postResult.rows.length === 0) {
      return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
    }

    const result = await db.execute({
      sql: `INSERT INTO comments (content, author_id, post_id, parent_id) VALUES (?, ?, ?, ?)`,
      args: [content, payload.userId, postId, parent_id || null],
    });

    const commentResult = await db.execute({
      sql: `SELECT cm.*, u.display_name as author_name, u.avatar_url as author_avatar, u.role as author_role
      FROM comments cm JOIN users u ON cm.author_id = u.id
      WHERE cm.id = ?`,
      args: [result.lastInsertRowid!],
    });

    // Award points for commenting
    await addPoints(payload.userId, 2, "comment", `评论帖子`, Number(result.lastInsertRowid), "comment");

    return NextResponse.json({ comment: commentResult.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Failed to create comment:", error);
    return NextResponse.json(
      { error: "评论失败" },
      { status: 500 }
    );
  }
}
