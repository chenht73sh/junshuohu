import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all"; // "all" | "month"

    const db = await initializeDatabase();

    let sql: string;
    if (period === "month") {
      sql = `SELECT u.id, u.username, u.display_name, u.avatar_url,
               COALESCE(SUM(pr.points), 0) as period_points,
               COALESCE(u.total_points, 0) as total_points
             FROM users u
             LEFT JOIN point_records pr ON pr.user_id = u.id
               AND strftime('%Y-%m', pr.created_at) = strftime('%Y-%m', 'now')
             GROUP BY u.id
             HAVING period_points > 0
             ORDER BY period_points DESC
             LIMIT 20`;
    } else {
      sql = `SELECT u.id, u.username, u.display_name, u.avatar_url,
               COALESCE(u.total_points, 0) as total_points,
               COALESCE(u.total_points, 0) as period_points
             FROM users u
             WHERE u.total_points > 0
             ORDER BY u.total_points DESC
             LIMIT 20`;
    }

    const result = await db.execute({ sql, args: [] });

    return NextResponse.json({ leaderboard: result.rows, period });
  } catch (error) {
    console.error("GET leaderboard error:", error);
    return NextResponse.json({ error: "获取排行榜失败" }, { status: 500 });
  }
}
