import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const db = initializeDatabase();
    const users = db
      .prepare(
        `SELECT id, username, email, display_name, avatar_url, role, bio, created_at
         FROM users ORDER BY created_at DESC`
      )
      .all();

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "获取用户列表失败" }, { status: 500 });
  }
}
