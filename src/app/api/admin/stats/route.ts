import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireModerator } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = requireModerator(request);
    if (auth instanceof NextResponse) return auth;

    const db = await initializeDatabase();

    const userCountResult = await db.execute({ sql: "SELECT COUNT(*) as cnt FROM users", args: [] });
    const postCountResult = await db.execute({ sql: "SELECT COUNT(*) as cnt FROM posts", args: [] });
    const courseCountResult = await db.execute({ sql: "SELECT COUNT(*) as cnt FROM courses", args: [] });
    const enrollmentCountResult = await db.execute({ sql: "SELECT COUNT(*) as cnt FROM enrollments", args: [] });

    const userCount = userCountResult.rows[0].cnt as number;
    const postCount = postCountResult.rows[0].cnt as number;
    const courseCount = courseCountResult.rows[0].cnt as number;
    const enrollmentCount = enrollmentCountResult.rows[0].cnt as number;

    // Recent users (latest 5)
    const recentUsersResult = await db.execute({
      sql: `SELECT id, username, display_name, role, created_at
            FROM users ORDER BY created_at DESC LIMIT 5`,
      args: [],
    });

    // Recent posts (latest 5)
    const recentPostsResult = await db.execute({
      sql: `SELECT p.id, p.title, p.created_at, p.view_count,
                u.display_name as author_name,
                c.name as category_name
         FROM posts p
         JOIN users u ON p.author_id = u.id
         JOIN categories c ON p.category_id = c.id
         ORDER BY p.created_at DESC LIMIT 5`,
      args: [],
    });

    return NextResponse.json({
      stats: {
        userCount,
        postCount,
        courseCount,
        enrollmentCount,
      },
      recentUsers: recentUsersResult.rows,
      recentPosts: recentPostsResult.rows,
    });
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return NextResponse.json({ error: "获取统计数据失败" }, { status: 500 });
  }
}
