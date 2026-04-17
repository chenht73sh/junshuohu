import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireModerator } from "@/lib/auth";
import { JwtPayload } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authResult = requireModerator(request);
    if (authResult instanceof NextResponse) return authResult;

    const db = initializeDatabase();

    const announcements = db
      .prepare(
        `SELECT a.*,
          u.display_name as author_name,
          c.name as category_name,
          c.color as category_color
        FROM announcements a
        JOIN users u ON a.author_id = u.id
        LEFT JOIN categories c ON a.category_id = c.id
        ORDER BY a.is_pinned DESC, a.created_at DESC`
      )
      .all();

    return NextResponse.json({ announcements });
  } catch (error) {
    console.error("Failed to fetch announcements:", error);
    return NextResponse.json(
      { error: "获取公告列表失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireModerator(request);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult as JwtPayload;

    const body = await request.json();
    const { title, content, image_url, category_id, is_pinned, expire_at } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
    }
    if (!content || !content.trim()) {
      return NextResponse.json({ error: "内容不能为空" }, { status: 400 });
    }

    const db = initializeDatabase();

    const result = db
      .prepare(
        `INSERT INTO announcements (title, content, image_url, category_id, author_id, is_pinned, expire_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        title.trim(),
        content.trim(),
        image_url || null,
        category_id || null,
        user.userId,
        is_pinned ? 1 : 0,
        expire_at || null
      );

    const announcement = db
      .prepare(
        `SELECT a.*, u.display_name as author_name, c.name as category_name, c.color as category_color
         FROM announcements a
         JOIN users u ON a.author_id = u.id
         LEFT JOIN categories c ON a.category_id = c.id
         WHERE a.id = ?`
      )
      .get(result.lastInsertRowid);

    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    console.error("Failed to create announcement:", error);
    return NextResponse.json(
      { error: "创建公告失败" },
      { status: 500 }
    );
  }
}
