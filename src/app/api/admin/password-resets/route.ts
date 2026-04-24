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
      sql: `SELECT * FROM password_reset_requests ORDER BY created_at DESC`,
      args: [],
    });

    const pendingResult = await db.execute({
      sql: `SELECT COUNT(*) as cnt FROM password_reset_requests WHERE status = 'pending'`,
      args: [],
    });

    return NextResponse.json({
      requests: result.rows,
      pendingCount: pendingResult.rows[0].cnt as number,
    });
  } catch (error) {
    console.error("GET password-resets error:", error);
    return NextResponse.json({ error: "获取申请列表失败" }, { status: 500 });
  }
}
