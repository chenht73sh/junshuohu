import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/messages/unread-count
// Returns total unread message count for the current user
export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const meId = auth.userId;
  const db = await initializeDatabase();

  const result = await db.execute({
    sql: "SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0",
    args: [meId],
  });

  const count = result.rows[0].count as number;
  return NextResponse.json({ count });
}
