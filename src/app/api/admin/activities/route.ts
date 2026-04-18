import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const db = await initializeDatabase();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    const countResult = await db.execute({
      sql: "SELECT COUNT(*) as cnt FROM activities",
      args: [],
    });
    const total = countResult.rows[0].cnt as number;

    const result = await db.execute({
      sql: `SELECT
        a.*,
        c.name as category_name,
        u.display_name as creator_name,
        (SELECT COUNT(*) FROM activity_participants WHERE activity_id = a.id) as participant_count
      FROM activities a
      LEFT JOIN categories c ON c.id = a.category_id
      LEFT JOIN users u ON u.id = a.created_by
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?`,
      args: [limit, offset],
    });

    return NextResponse.json({
      activities: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/admin/activities error:", error);
    return NextResponse.json({ error: "获取活动列表失败" }, { status: 500 });
  }
}
