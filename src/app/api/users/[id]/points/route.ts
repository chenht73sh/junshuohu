import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) return NextResponse.json({ error: "无效用户ID" }, { status: 400 });

    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    if (auth.userId !== userId && auth.role !== "admin") {
      return NextResponse.json({ error: "无权查看" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    const db = await initializeDatabase();

    const [countResult, recordsResult, totalResult] = await Promise.all([
      db.execute({
        sql: "SELECT COUNT(*) as cnt FROM point_records WHERE user_id = ?",
        args: [userId],
      }),
      db.execute({
        sql: `SELECT * FROM point_records WHERE user_id = ?
              ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        args: [userId, limit, offset],
      }),
      db.execute({
        sql: "SELECT COALESCE(total_points, 0) as total_points FROM users WHERE id = ?",
        args: [userId],
      }),
    ]);

    const total = countResult.rows[0].cnt as number;
    const totalPoints = totalResult.rows.length > 0
      ? (totalResult.rows[0].total_points as number)
      : 0;

    return NextResponse.json({
      records: recordsResult.rows,
      totalPoints,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET points error:", error);
    return NextResponse.json({ error: "获取积分记录失败" }, { status: 500 });
  }
}
