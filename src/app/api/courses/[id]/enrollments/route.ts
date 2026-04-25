import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const courseId = parseInt(id, 10);
    if (isNaN(courseId)) {
      return NextResponse.json({ error: "无效的课程ID" }, { status: 400 });
    }

    const db = await initializeDatabase();

    // Check course exists
    const courseResult = await db.execute({
      sql: "SELECT id FROM courses WHERE id = ?",
      args: [courseId],
    });
    if (courseResult.rows.length === 0) {
      return NextResponse.json({ error: "课程不存在" }, { status: 404 });
    }

    const result = await db.execute({
      sql: `SELECT e.id, e.created_at, e.payment_type, e.guest_count,
        u.id as user_id, u.display_name, u.avatar_url
       FROM enrollments e
       JOIN users u ON e.user_id = u.id
       WHERE e.course_id = ?
       ORDER BY e.created_at ASC`,
      args: [courseId],
    });

    return NextResponse.json({ enrollments: result.rows });
  } catch (error) {
    console.error("Failed to fetch enrollments:", error);
    return NextResponse.json(
      { error: "获取报名名单失败" },
      { status: 500 }
    );
  }
}
