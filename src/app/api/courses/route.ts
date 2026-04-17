import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = initializeDatabase();

    const courses = db
      .prepare(
        `SELECT co.*, c.name as category_name, c.color as category_color
         FROM courses co
         JOIN categories c ON co.category_id = c.id
         ORDER BY co.start_time ASC`
      )
      .all();

    return NextResponse.json({ courses });
  } catch (error) {
    console.error("Failed to fetch courses:", error);
    return NextResponse.json(
      { error: "获取课程列表失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Only admin and moderator can create courses
    if (payload.role !== "admin" && payload.role !== "moderator") {
      return NextResponse.json(
        { error: "仅管理员和版主可以创建课程" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      category_id,
      instructor,
      start_time,
      location,
      max_participants,
    } = body;

    if (!title || !instructor || !category_id) {
      return NextResponse.json(
        { error: "课程名称、讲师和板块为必填项" },
        { status: 400 }
      );
    }

    const db = initializeDatabase();

    const result = db
      .prepare(
        `INSERT INTO courses (title, description, category_id, instructor, start_time, location, max_participants)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        title,
        description || null,
        category_id,
        instructor,
        start_time || null,
        location || null,
        max_participants || null
      );

    const course = db
      .prepare(
        `SELECT co.*, c.name as category_name, c.color as category_color
         FROM courses co
         JOIN categories c ON co.category_id = c.id
         WHERE co.id = ?`
      )
      .get(result.lastInsertRowid);

    return NextResponse.json({ course }, { status: 201 });
  } catch (error) {
    console.error("Failed to create course:", error);
    return NextResponse.json(
      { error: "创建课程失败" },
      { status: 500 }
    );
  }
}
