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

    const course = db
      .prepare(
        `SELECT co.*, c.name as category_name, c.color as category_color
         FROM courses co
         JOIN categories c ON co.category_id = c.id
         WHERE co.id = ?`
      )
      .get(courseId);

    if (!course) {
      return NextResponse.json({ error: "课程不存在" }, { status: 404 });
    }

    return NextResponse.json({ course });
  } catch (error) {
    console.error("Failed to fetch course:", error);
    return NextResponse.json(
      { error: "获取课程详情失败" },
      { status: 500 }
    );
  }
}
