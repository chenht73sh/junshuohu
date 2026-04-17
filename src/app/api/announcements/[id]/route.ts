import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const announcementId = parseInt(id, 10);
    if (isNaN(announcementId)) {
      return NextResponse.json({ error: "无效的公告ID" }, { status: 400 });
    }

    const db = initializeDatabase();

    const announcement = db
      .prepare(
        `SELECT a.*,
          u.display_name as author_name,
          c.name as category_name,
          c.color as category_color
        FROM announcements a
        JOIN users u ON a.author_id = u.id
        LEFT JOIN categories c ON a.category_id = c.id
        WHERE a.id = ?`
      )
      .get(announcementId);

    if (!announcement) {
      return NextResponse.json({ error: "公告不存在" }, { status: 404 });
    }

    return NextResponse.json({ announcement });
  } catch (error) {
    console.error("Failed to fetch announcement:", error);
    return NextResponse.json(
      { error: "获取公告详情失败" },
      { status: 500 }
    );
  }
}
