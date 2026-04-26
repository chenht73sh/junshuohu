import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/courses/[id]/qr-checkin — QR code self check-in for enrolled students
// Requires auth token in query string or Authorization header
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const courseId = parseInt(id, 10);
  if (isNaN(courseId)) {
    return NextResponse.json({ error: "无效的课程ID" }, { status: 400 });
  }

  // Try to get token from Authorization header first, then query param
  let token: string | null = null;
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else {
    const { searchParams } = new URL(request.url);
    token = searchParams.get("token");
  }

  if (!token) {
    return NextResponse.json(
      { error: "未登录", code: "NOT_LOGGED_IN" },
      { status: 401 }
    );
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: "登录已过期，请重新登录", code: "TOKEN_EXPIRED" },
      { status: 401 }
    );
  }

  const db = await initializeDatabase();

  // Check course exists
  const courseResult = await db.execute({
    sql: "SELECT id, title, start_time FROM courses WHERE id = ?",
    args: [courseId],
  });
  if (courseResult.rows.length === 0) {
    return NextResponse.json({ error: "课程不存在" }, { status: 404 });
  }
  const course = courseResult.rows[0];

  // Check enrollment
  const enrollResult = await db.execute({
    sql: "SELECT id, checked_in, checked_in_at FROM enrollments WHERE course_id = ? AND user_id = ? AND is_manual = 0",
    args: [courseId, payload.userId],
  });

  if (enrollResult.rows.length === 0) {
    return NextResponse.json(
      { error: "您未报名此课程", code: "NOT_ENROLLED" },
      { status: 403 }
    );
  }

  const enrollment = enrollResult.rows[0] as unknown as {
    id: number;
    checked_in: number;
    checked_in_at: string | null;
  };

  if (enrollment.checked_in) {
    return NextResponse.json({
      success: false,
      code: "ALREADY_CHECKED_IN",
      message: "您已签到，无需重复操作",
      checkedInAt: enrollment.checked_in_at,
      courseTitle: course.title,
    });
  }

  // Do the check-in
  await db.execute({
    sql: `UPDATE enrollments
          SET checked_in = 1,
              checked_in_at = datetime('now'),
              check_in_method = 'qrcode'
          WHERE id = ?`,
    args: [enrollment.id],
  });

  return NextResponse.json({
    success: true,
    code: "CHECKED_IN",
    message: "签到成功",
    courseTitle: course.title,
    checkedInAt: new Date().toISOString(),
  });
}
