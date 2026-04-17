import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireModerator } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = requireModerator(request);
    if (auth instanceof NextResponse) return auth;

    const db = initializeDatabase();

    const userCount = (
      db.prepare("SELECT COUNT(*) as cnt FROM users").get() as { cnt: number }
    ).cnt;

    const postCount = (
      db.prepare("SELECT COUNT(*) as cnt FROM posts").get() as { cnt: number }
    ).cnt;

    const courseCount = (
      db.prepare("SELECT COUNT(*) as cnt FROM courses").get() as { cnt: number }
    ).cnt;

    const enrollmentCount = (
      db.prepare("SELECT COUNT(*) as cnt FROM enrollments").get() as {
        cnt: number;
      }
    ).cnt;

    // Recent users (latest 5)
    const recentUsers = db
      .prepare(
        `SELECT id, username, display_name, role, created_at
         FROM users ORDER BY created_at DESC LIMIT 5`
      )
      .all();

    // Recent posts (latest 5)
    const recentPosts = db
      .prepare(
        `SELECT p.id, p.title, p.created_at, p.view_count,
                u.display_name as author_name,
                c.name as category_name
         FROM posts p
         JOIN users u ON p.author_id = u.id
         JOIN categories c ON p.category_id = c.id
         ORDER BY p.created_at DESC LIMIT 5`
      )
      .all();

    return NextResponse.json({
      stats: {
        userCount,
        postCount,
        courseCount,
        enrollmentCount,
      },
      recentUsers,
      recentPosts,
    });
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return NextResponse.json({ error: "获取统计数据失败" }, { status: 500 });
  }
}
