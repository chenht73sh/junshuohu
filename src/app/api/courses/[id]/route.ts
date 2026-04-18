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

    const db = await initializeDatabase();

    const result = await db.execute({
      sql: `SELECT co.*, c.name as category_name, c.color as category_color
            FROM courses co
            JOIN categories c ON co.category_id = c.id
            WHERE co.id = ?`,
      args: [courseId],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "课程不存在" }, { status: 404 });
    }

    return NextResponse.json({ course: result.rows[0] });
  } catch (error) {
    console.error("Failed to fetch course:", error);
    return NextResponse.json(
      { error: "获取课程详情失败" },
      { status: 500 }
    );
  }
}
