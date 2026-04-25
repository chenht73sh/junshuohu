import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/messages?withUserId=xxx&page=1&limit=20
// Returns conversation history with a specific user, marks incoming messages as read
export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const withUserId = parseInt(searchParams.get("withUserId") || "", 10);
  if (isNaN(withUserId) || withUserId <= 0) {
    return NextResponse.json({ error: "缺少 withUserId 参数" }, { status: 400 });
  }

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const offset = (page - 1) * limit;

  const meId = auth.userId;

  const db = await initializeDatabase();

  // Mark incoming messages from withUserId as read
  await db.execute({
    sql: "UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0",
    args: [withUserId, meId],
  });

  const countResult = await db.execute({
    sql: `SELECT COUNT(*) as cnt FROM messages
          WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)`,
    args: [meId, withUserId, withUserId, meId],
  });
  const total = countResult.rows[0].cnt as number;

  const result = await db.execute({
    sql: `SELECT m.id, m.sender_id, m.receiver_id, m.content, m.is_read, m.created_at,
            u.display_name as sender_name, u.avatar_url as sender_avatar
          FROM messages m
          JOIN users u ON u.id = m.sender_id
          WHERE (m.sender_id = ? AND m.receiver_id = ?)
             OR (m.sender_id = ? AND m.receiver_id = ?)
          ORDER BY m.created_at ASC
          LIMIT ? OFFSET ?`,
    args: [meId, withUserId, withUserId, meId, limit, offset],
  });

  return NextResponse.json({
    messages: result.rows,
    total,
    page,
    limit,
  });
}

// POST /api/messages — send a message
// Body: { receiverId: number, content: string }
export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const meId = auth.userId;

  let body: { receiverId?: number; content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const { receiverId, content } = body;

  if (!receiverId || typeof receiverId !== "number") {
    return NextResponse.json({ error: "缺少 receiverId" }, { status: 400 });
  }
  if (receiverId === meId) {
    return NextResponse.json({ error: "不能给自己发私信" }, { status: 400 });
  }
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "消息内容不能为空" }, { status: 400 });
  }
  if (content.length > 1000) {
    return NextResponse.json({ error: "消息内容不能超过1000字" }, { status: 400 });
  }

  const db = await initializeDatabase();

  // Verify receiver exists
  const userCheck = await db.execute({
    sql: "SELECT id FROM users WHERE id = ?",
    args: [receiverId],
  });
  if (userCheck.rows.length === 0) {
    return NextResponse.json({ error: "收件人不存在" }, { status: 404 });
  }

  const insertResult = await db.execute({
    sql: "INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)",
    args: [meId, receiverId, content.trim()],
  });

  const newMsg = await db.execute({
    sql: `SELECT m.id, m.sender_id, m.receiver_id, m.content, m.is_read, m.created_at,
            u.display_name as sender_name, u.avatar_url as sender_avatar
          FROM messages m
          JOIN users u ON u.id = m.sender_id
          WHERE m.id = ?`,
    args: [Number(insertResult.lastInsertRowid)],
  });

  return NextResponse.json({ message: newMsg.rows[0] }, { status: 201 });
}
