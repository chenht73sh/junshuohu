import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireModerator } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = requireModerator(request);
    if (auth instanceof NextResponse) return auth;

    const db = await initializeDatabase();
    const result = await db.execute({
      sql: `SELECT p.id, p.title, p.is_pinned, p.is_featured, p.view_count,
                p.created_at, p.updated_at,
                u.display_name as author_name,
                c.name as category_name, c.color as category_color
         FROM posts p
         JOIN users u ON p.author_id = u.id
         JOIN categories c ON p.category_id = c.id
         ORDER BY p.created_at DESC`,
      args: [],
    });

    return NextResponse.json({ posts: result.rows });
  } catch (error) {
    console.error("Failed to fetch posts:", error);
    return NextResponse.json({ error: "获取帖子列表失败" }, { status: 500 });
  }
}
