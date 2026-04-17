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

    const db = initializeDatabase();

    // Use transaction for atomicity
    const enrollTransaction = db.transaction(() => {
      // Check course exists and is open
      const course = db
        .prepare("SELECT id, title, max_participants, current_participants, status FROM courses WHERE id = ?")
        .get(courseId) as CourseRow | undefined;

      if (!course) {
        return { error: "课程不存在", status: 404 };
      }

      if (course.status !== "open") {
        return { error: "课程报名已关闭", status: 400 };
      }

      // Check if already enrolled
      const existing = db
        .prepare("SELECT id FROM enrollments WHERE course_id = ? AND user_id = ?")
        .get(courseId, payload.userId);

      if (existing) {
        return { error: "您已报名该课程", status: 409 };
      }

      // Check capacity
      if (
        course.max_participants !== null &&
        course.current_participants >= course.max_participants
      ) {
        return { error: "课程已满员", status: 400 };
      }

      // Insert enrollment and update count
      db.prepare(
        "INSERT INTO enrollments (course_id, user_id) VALUES (?, ?)"
      ).run(courseId, payload.userId);

      db.prepare(
        "UPDATE courses SET current_participants = current_participants + 1 WHERE id = ?"
      ).run(courseId);

      return { success: true, courseTitle: course.title };
    });

    const result = enrollTransaction();

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(
      { message: `成功报名「${result.courseTitle}」`, enrolled: true },
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
