import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const db = await initializeDatabase();

  const result = await db.execute({
    sql: `
      SELECT id, card_type, total_sessions, remaining_sessions, purchase_date, notes
      FROM member_cards
      WHERE user_id = ? AND remaining_sessions > 0
      ORDER BY created_at ASC
    `,
    args: [auth.userId],
  });

  return NextResponse.json({ cards: result.rows });
}
