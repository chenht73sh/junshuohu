import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireModerator } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = requireModerator(request);
    if (auth instanceof NextResponse) return auth;

    const db = await initializeDatabase();
    const result = await db.execute({
      sql: `SELECT co.*, c.name as category_name, c.color as category_color
            FROM courses co
            JOIN categories c ON co.category_id = c.id
            ORDER BY co.created_at DESC`,
      args: [],
    });

    return NextResponse.json({ courses: result.rows });
  } catch (error) {
    console.error("Failed to fetch courses:", error);
    return NextResponse.json({ error: "获取课程列表失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireModerator(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { title, description, category_id, instructor, start_time, location, max_participants } =
      body;

    if (!title?.trim() || !instructor?.trim() || !category_id) {
      return NextResponse.json(
        { error: "标题、讲师和板块为必填项" },
        { status: 400 }
      );
    }

    const db = await initializeDatabase();

    const result = await db.execute({
      sql: `INSERT INTO courses (title, description, category_id, instructor, start_time, location, max_participants)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        title.trim(),
        description?.trim() || null,
        category_id,
        instructor.trim(),
        start_time || null,
        location?.trim() || null,
        max_participants || null,
      ],
    });

    return NextResponse.json(
      { message: "课程已创建", courseId: result.lastInsertRowid },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create course:", error);
    return NextResponse.json({ error: "创建课程失败" }, { status: 500 });
  }
}
