import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/admin/courses/[id]/checkin — admin manually toggles check-in status
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const courseId = parseInt(id, 10);
  if (isNaN(courseId)) {
    return NextResponse.json({ error: "无效的课程ID" }, { status: 400 });
  }

  let body: { enrollmentId?: number; checkedIn?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  const { enrollmentId, checkedIn } = body;
  if (typeof enrollmentId !== "number") {
    return NextResponse.json({ error: "enrollmentId 必填" }, { status: 400 });
  }

  const db = await initializeDatabase();

  const checkedInValue = checkedIn ? 1 : 0;
  const checkedInAt = checkedIn ? "datetime('now')" : "NULL";

  await db.execute({
    sql: `UPDATE enrollments
          SET checked_in = ?,
              checked_in_at = ${checkedIn ? "datetime('now')" : "NULL"},
              check_in_method = ${checkedIn ? "'manual'" : "NULL"}
          WHERE id = ? AND course_id = ?`,
    args: [checkedInValue, enrollmentId, courseId],
  });

  return NextResponse.json({
    message: checkedIn ? "签到成功" : "已取消签到",
    checkedIn: checkedIn,
  });
}
