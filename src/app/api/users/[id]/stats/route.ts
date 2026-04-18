import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) return NextResponse.json({ error: "无效用户ID" }, { status: 400 });

    const db = await initializeDatabase();

    const [postCount, commentCount, activityCount, pointsResult] = await Promise.all([
      db.execute({
        sql: "SELECT COUNT(*) as cnt FROM posts WHERE author_id = ?",
        args: [userId],
      }),
      db.execute({
        sql: "SELECT COUNT(*) as cnt FROM comments WHERE author_id = ?",
        args: [userId],
      }),
      db.execute({
        sql: "SELECT COUNT(*) as cnt FROM activity_participants WHERE user_id = ?",
        args: [userId],
      }),
      db.execute({
        sql: "SELECT COALESCE(total_points, 0) as total_points FROM users WHERE id = ?",
        args: [userId],
      }),
    ]);

    const posts = postCount.rows[0].cnt as number;
    const comments = commentCount.rows[0].cnt as number;
    const activities = activityCount.rows[0].cnt as number;
    const totalPoints = pointsResult.rows.length > 0
      ? (pointsResult.rows[0].total_points as number)
      : 0;

    // Compute radar dimensions (0-100 scale)
    const radar = {
      activity: Math.min(100, comments * 5),          // 活跃度: comments
      contribution: Math.min(100, posts * 10),         // 贡献度: posts
      participation: Math.min(100, activities * 10),   // 参与度: activities
      influence: Math.min(100, totalPoints / 10),      // 影响力: points
      growth: Math.min(100, (posts + comments + activities) * 3), // 成长值
    };

    return NextResponse.json({ posts, comments, activities, totalPoints, radar });
  } catch (error) {
    console.error("GET stats error:", error);
    return NextResponse.json({ error: "获取统计失败" }, { status: 500 });
  }
}
