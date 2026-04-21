import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const db = await initializeDatabase();
    const result = await db.execute({
      sql: `SELECT c.title as course_title, c.instructor, c.start_time,
                   u.username, u.display_name, u.phone, u.email,
                   e.created_at as enroll_time
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            JOIN users u ON e.user_id = u.id
            ORDER BY c.title, e.created_at`,
      args: [],
    });

    return NextResponse.json({ enrollments: result.rows });
  } catch (error) {
    console.error("Failed to export course enrollments:", error);
    return NextResponse.json({ error: "导出课程报名信息失败" }, { status: 500 });
  }
}
