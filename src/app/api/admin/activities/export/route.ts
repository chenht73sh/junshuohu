import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const db = await initializeDatabase();
    const result = await db.execute({
      sql: `SELECT a.title as activity_title, a.speaker, a.activity_date, a.location,
                   u.username, u.display_name, u.phone, u.email,
                   ap.signed_in, ap.created_at as join_time
            FROM activity_participants ap
            JOIN activities a ON ap.activity_id = a.id
            JOIN users u ON ap.user_id = u.id
            ORDER BY a.activity_date DESC, ap.created_at`,
      args: [],
    });

    return NextResponse.json({ participants: result.rows });
  } catch (error) {
    console.error("Failed to export activity participants:", error);
    return NextResponse.json({ error: "导出活动报名信息失败" }, { status: 500 });
  }
}
