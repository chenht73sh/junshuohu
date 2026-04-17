import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const courseId = parseInt(id, 10);
    if (isNaN(courseId)) {
      return NextResponse.json({ error: "无效的课程ID" }, { status: 400 });
    }

    const db = initializeDatabase();

    // Check course exists
    const course = db
      .prepare("SELECT id FROM courses WHERE id = ?")
      .get(courseId);
    if (!course) {
      return NextResponse.json({ error: "课程不存在" }, { status: 404 });
    }

    const enrollments = db
      .prepare(
        `SELECT e.id, e.created_at,
          u.id as user_id, u.display_name, u.avatar_url
         FROM enrollments e
         JOIN users u ON e.user_id = u.id
         WHERE e.course_id = ?
         ORDER BY e.created_at ASC`
      )
      .all(courseId);

    return NextResponse.json({ enrollments });
  } catch (error) {
    console.error("Failed to fetch enrollments:", error);
    return NextResponse.json(
      { error: "获取报名名单失败" },
      { status: 500 }
    );
  }
}
