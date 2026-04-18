import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface CourseRow {
  id: number;
  title: string;
  max_participants: number | null;
  current_participants: number;
  status: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const courseId = parseInt(id, 10);
    if (isNaN(courseId)) {
      return NextResponse.json({ error: "无效的课程ID" }, { status: 400 });
    }

    // Verify auth
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "登录已过期，请重新登录" },
        { status: 401 }
      );
    }

    const db = await initializeDatabase();

    // Check course exists and is open
    const courseResult = await db.execute({
      sql: "SELECT id, title, max_participants, current_participants, status FROM courses WHERE id = ?",
      args: [courseId],
    });

    if (courseResult.rows.length === 0) {
      return NextResponse.json({ error: "课程不存在" }, { status: 404 });
    }

    const course = courseResult.rows[0] as unknown as CourseRow;

    if (course.status !== "open") {
      return NextResponse.json({ error: "课程报名已关闭" }, { status: 400 });
    }

    // Check if already enrolled
    const existingResult = await db.execute({
      sql: "SELECT id FROM enrollments WHERE course_id = ? AND user_id = ?",
      args: [courseId, payload.userId],
    });

    if (existingResult.rows.length > 0) {
      return NextResponse.json({ error: "您已报名该课程" }, { status: 409 });
    }

    // Check capacity
    if (
      course.max_participants !== null &&
      course.current_participants >= course.max_participants
    ) {
      return NextResponse.json({ error: "课程已满员" }, { status: 400 });
    }

    // Insert enrollment and update count
    await db.batch([
      {
        sql: "INSERT INTO enrollments (course_id, user_id) VALUES (?, ?)",
        args: [courseId, payload.userId],
      },
      {
        sql: "UPDATE courses SET current_participants = current_participants + 1 WHERE id = ?",
        args: [courseId],
      },
    ], "write");

    return NextResponse.json(
      { message: `成功报名「${course.title}」`, enrolled: true },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to enroll:", error);
    return NextResponse.json(
      { error: "报名失败，请稍后重试" },
      { status: 500 }
    );
  }
}
