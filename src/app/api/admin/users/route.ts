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
      sql: `SELECT id, username, email, phone, display_name, avatar_url, role, bio, created_at, total_points
            FROM users ORDER BY created_at DESC`,
      args: [],
    });

    return NextResponse.json({ users: result.rows });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "获取用户列表失败" }, { status: 500 });
  }
}
