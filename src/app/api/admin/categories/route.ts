import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireModerator, requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = requireModerator(request);
    if (auth instanceof NextResponse) return auth;

    const db = await initializeDatabase();
    const result = await db.execute({
      sql: `SELECT c.*, COUNT(p.id) as post_count
            FROM categories c
            LEFT JOIN posts p ON p.category_id = c.id
            GROUP BY c.id
            ORDER BY c.sort_order ASC, c.id ASC`,
      args: [],
    });

    return NextResponse.json({ categories: result.rows });
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return NextResponse.json({ error: "获取板块列表失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { name, description, moderator_name, icon, color, sort_order } = body;

    if (!name?.trim() || !description?.trim() || !moderator_name?.trim()) {
      return NextResponse.json(
        { error: "板块名称、描述和主理人为必填项" },
        { status: 400 }
      );
    }

    const db = await initializeDatabase();

    // Check for duplicate name
    const existingResult = await db.execute({
      sql: "SELECT id FROM categories WHERE name = ?",
      args: [name.trim()],
    });
    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { error: "已存在同名板块" },
        { status: 400 }
      );
    }

    const result = await db.execute({
      sql: `INSERT INTO categories (name, description, moderator_name, icon, color, sort_order)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        name.trim(),
        description.trim(),
        moderator_name.trim(),
        icon?.trim() || null,
        color?.trim() || null,
        typeof sort_order === "number" ? sort_order : 0,
      ],
    });

    return NextResponse.json(
      { message: "板块已创建", categoryId: result.lastInsertRowid },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create category:", error);
    return NextResponse.json({ error: "创建板块失败" }, { status: 500 });
  }
}
