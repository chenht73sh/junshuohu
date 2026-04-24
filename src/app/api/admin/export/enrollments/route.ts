import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function escapeCSV(value: any): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    const db = await initializeDatabase();

    const sql = courseId
      ? `SELECT c.title as course_title, u.username, u.display_name, u.email, e.created_at
         FROM enrollments e
         JOIN courses c ON c.id = e.course_id
         JOIN users u ON u.id = e.user_id
         WHERE e.course_id = ?
         ORDER BY e.created_at ASC`
      : `SELECT c.title as course_title, u.username, u.display_name, u.email, e.created_at
         FROM enrollments e
         JOIN courses c ON c.id = e.course_id
         JOIN users u ON u.id = e.user_id
         ORDER BY c.title ASC, e.created_at ASC`;

    const result = await db.execute({
      sql,
      args: courseId ? [courseId] : [],
    });

    const BOM = "\uFEFF";
    const header = "课程名称,用户名,昵称,邮箱,报名时间\r\n";
    const rows = result.rows
      .map((r) =>
        [r.course_title, r.username, r.display_name, r.email, r.created_at]
          .map(escapeCSV)
          .join(",")
      )
      .join("\r\n");

    const csv = BOM + header + rows;
    const suffix = courseId ? `_course${courseId}` : "";

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="enrollments${suffix}_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export enrollments error:", error);
    return NextResponse.json({ error: "导出失败" }, { status: 500 });
  }
}
