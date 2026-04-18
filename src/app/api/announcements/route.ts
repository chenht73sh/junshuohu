import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    const db = await initializeDatabase();

    const countResult = await db.execute({
      sql: `SELECT COUNT(*) as total FROM announcements
            WHERE expire_at IS NULL OR expire_at > datetime('now')`,
      args: [],
    });
    const totalCount = countResult.rows[0].total as number;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    const result = await db.execute({
      sql: `SELECT a.*,
        u.display_name as author_name,
        c.name as category_name,
        c.color as category_color
      FROM announcements a
      JOIN users u ON a.author_id = u.id
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE a.expire_at IS NULL OR a.expire_at > datetime('now')
      ORDER BY a.is_pinned DESC, a.created_at DESC
      LIMIT ? OFFSET ?`,
      args: [limit, offset],
    });

    return NextResponse.json({
      announcements: result.rows,
      total: totalCount,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error("Failed to fetch announcements:", error);
    return NextResponse.json(
      { error: "获取公告列表失败" },
      { status: 500 }
    );
  }
}
