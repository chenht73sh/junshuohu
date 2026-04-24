import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const db = await initializeDatabase();

    const result = await db.execute({
      sql: `SELECT id, username, display_name, avatar_url, COALESCE(total_points, 0) as total_points, created_at
            FROM users
            ORDER BY total_points DESC, created_at ASC
            LIMIT 50`,
      args: [],
    });

    return NextResponse.json({ users: result.rows });
  } catch (error) {
    console.error("leaderboard error:", error);
    return NextResponse.json({ error: "获取排行榜失败" }, { status: 500 });
  }
}
