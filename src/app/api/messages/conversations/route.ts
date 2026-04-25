import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/messages/conversations
// Returns all conversations for the current user, each with the latest message and unread count
export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const meId = auth.userId;
  const db = await initializeDatabase();

  // Get the latest message per conversation partner, along with unread count and user info
  const result = await db.execute({
    sql: `SELECT
        CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END as other_user_id,
        m.content as last_message,
        m.created_at as last_time,
        m.is_read,
        m.sender_id,
        (SELECT COUNT(*) FROM messages
         WHERE sender_id = (CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END)
           AND receiver_id = ?
           AND is_read = 0) as unread_count,
        u.username,
        u.display_name,
        u.avatar_url
      FROM messages m
      JOIN users u ON u.id = (CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END)
      WHERE m.sender_id = ? OR m.receiver_id = ?
      GROUP BY other_user_id
      ORDER BY m.created_at DESC`,
    args: [meId, meId, meId, meId, meId, meId],
  });

  return NextResponse.json({ conversations: result.rows });
}
