import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET  /api/admin/courses/[id]/enrollments — list all enrollments for a course
export async function GET(
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

  const db = await initializeDatabase();

  const courseResult = await db.execute({
    sql: "SELECT id, title, start_time, location, status, max_participants, current_participants FROM courses WHERE id = ?",
    args: [courseId],
  });
  if (courseResult.rows.length === 0) {
    return NextResponse.json({ error: "课程不存在" }, { status: 404 });
  }
  const course = courseResult.rows[0];

  const result = await db.execute({
    sql: `SELECT
            e.id, e.is_manual, e.guest_name, e.guest_phone,
            e.payment_type, e.single_price, e.guest_count,
            e.checked_in, e.checked_in_at, e.check_in_method,
            e.created_at,
            u.id   AS user_id,
            u.display_name,
            u.username,
            u.phone
          FROM enrollments e
          LEFT JOIN users u ON e.user_id = u.id AND e.is_manual = 0
          WHERE e.course_id = ?
          ORDER BY e.created_at ASC`,
    args: [courseId],
  });

  return NextResponse.json({ course, enrollments: result.rows });
}

// POST /api/admin/courses/[id]/enrollments — manually add an enrollment
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

  let body: {
    guestName?: string;
    guestPhone?: string;
    paymentType?: string;
    guestCount?: number;
    notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  const guestName = (body.guestName || "").trim();
  if (!guestName) {
    return NextResponse.json({ error: "姓名不能为空" }, { status: 400 });
  }

  const paymentType = body.paymentType || "次卡";
  const guestCount = Math.max(0, Math.min(5, parseInt(String(body.guestCount ?? 0), 10) || 0));
  const guestPhone = (body.guestPhone || "").trim() || null;

  const db = await initializeDatabase();

  const courseResult = await db.execute({
    sql: "SELECT id, title, status FROM courses WHERE id = ?",
    args: [courseId],
  });
  if (courseResult.rows.length === 0) {
    return NextResponse.json({ error: "课程不存在" }, { status: 404 });
  }

  // Insert with user_id = 0 (reserved guest id), is_manual = 1
  await db.execute({
    sql: `INSERT INTO enrollments
            (course_id, user_id, is_manual, guest_name, guest_phone, payment_type, guest_count)
          VALUES (?, 0, 1, ?, ?, ?, ?)`,
    args: [courseId, guestName, guestPhone, paymentType, guestCount],
  });

  // Update participant count
  await db.execute({
    sql: "UPDATE courses SET current_participants = current_participants + 1 WHERE id = ?",
    args: [courseId],
  });

  return NextResponse.json({ message: "手动报名添加成功" }, { status: 201 });
}

// DELETE /api/admin/courses/[id]/enrollments?enrollmentId=N — delete a manual enrollment
export async function DELETE(
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

  const { searchParams } = new URL(request.url);
  const enrollmentId = parseInt(searchParams.get("enrollmentId") || "", 10);
  if (isNaN(enrollmentId)) {
    return NextResponse.json({ error: "无效的报名ID" }, { status: 400 });
  }

  const db = await initializeDatabase();

  const result = await db.execute({
    sql: "DELETE FROM enrollments WHERE id = ? AND is_manual = 1 AND course_id = ?",
    args: [enrollmentId, courseId],
  });

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "记录不存在或非手动报名，无法删除" }, { status: 404 });
  }

  // Update participant count
  await db.execute({
    sql: "UPDATE courses SET current_participants = MAX(0, current_participants - 1) WHERE id = ?",
    args: [courseId],
  });

  return NextResponse.json({ message: "删除成功" });
}
