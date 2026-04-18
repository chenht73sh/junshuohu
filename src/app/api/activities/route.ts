import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const db = await initializeDatabase();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12", 10)));
    const offset = (page - 1) * limit;
    const status = searchParams.get("status") || null;
    const categoryId = searchParams.get("category_id") ? parseInt(searchParams.get("category_id")!, 10) : null;

    let where = "WHERE 1=1";
    const bindings: (string | number)[] = [];

    if (status) {
      where += " AND a.status = ?";
      bindings.push(status);
    }
    if (categoryId) {
      where += " AND a.category_id = ?";
      bindings.push(categoryId);
    }

    const countResult = await db.execute({
      sql: `SELECT COUNT(*) as cnt FROM activities a ${where}`,
      args: bindings,
    });
    const total = countResult.rows[0].cnt as number;

    const result = await db.execute({
      sql: `SELECT
        a.*,
        c.name as category_name,
        c.color as category_color,
        u.display_name as creator_name,
        (SELECT COUNT(*) FROM activity_participants WHERE activity_id = a.id) as participant_count
      FROM activities a
      LEFT JOIN categories c ON c.id = a.category_id
      LEFT JOIN users u ON u.id = a.created_by
      ${where}
      ORDER BY a.activity_date DESC, a.start_time DESC
      LIMIT ? OFFSET ?`,
      args: [...bindings, limit, offset],
    });

    return NextResponse.json({
      activities: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/activities error:", error);
    return NextResponse.json({ error: "获取活动列表失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const {
      title,
      description,
      category_id,
      speaker,
      location,
      activity_date,
      start_time,
      end_time,
      max_participants,
      cover_image,
      summary,
      status,
    } = body;

    if (!title || !activity_date) {
      return NextResponse.json({ error: "标题和活动日期为必填项" }, { status: 400 });
    }

    const db = await initializeDatabase();
    const result = await db.execute({
      sql: `INSERT INTO activities
        (title, description, category_id, speaker, location, activity_date, start_time, end_time,
         max_participants, cover_image, summary, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        title,
        description || null,
        category_id || null,
        speaker || null,
        location || null,
        activity_date,
        start_time || null,
        end_time || null,
        max_participants || null,
        cover_image || null,
        summary || null,
        status || "upcoming",
        auth.userId,
      ],
    });

    return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
  } catch (error) {
    console.error("POST /api/activities error:", error);
    return NextResponse.json({ error: "创建活动失败" }, { status: 500 });
  }
}
