import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireModerator } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireModerator(request);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const announcementId = parseInt(id, 10);
    if (isNaN(announcementId)) {
      return NextResponse.json({ error: "无效的公告ID" }, { status: 400 });
    }

    const db = await initializeDatabase();

    const existingResult = await db.execute({
      sql: "SELECT id FROM announcements WHERE id = ?",
      args: [announcementId],
    });
    if (existingResult.rows.length === 0) {
      return NextResponse.json({ error: "公告不存在" }, { status: 404 });
    }

    const body = await request.json();
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (body.title !== undefined) {
      updates.push("title = ?");
      values.push(body.title.trim());
    }
    if (body.content !== undefined) {
      updates.push("content = ?");
      values.push(body.content.trim());
    }
    if (body.image_url !== undefined) {
      updates.push("image_url = ?");
      values.push(body.image_url || null);
    }
    if (body.category_id !== undefined) {
      updates.push("category_id = ?");
      values.push(body.category_id || null);
    }
    if (body.is_pinned !== undefined) {
      updates.push("is_pinned = ?");
      values.push(body.is_pinned ? 1 : 0);
    }
    if (body.expire_at !== undefined) {
      updates.push("expire_at = ?");
      values.push(body.expire_at || null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
    }

    updates.push("updated_at = datetime('now')");
    values.push(announcementId);

    await db.execute({
      sql: `UPDATE announcements SET ${updates.join(", ")} WHERE id = ?`,
      args: values,
    });

    const annResult = await db.execute({
      sql: `SELECT a.*, u.display_name as author_name, c.name as category_name, c.color as category_color
            FROM announcements a
            JOIN users u ON a.author_id = u.id
            LEFT JOIN categories c ON a.category_id = c.id
            WHERE a.id = ?`,
      args: [announcementId],
    });

    return NextResponse.json({ announcement: annResult.rows[0] });
  } catch (error) {
    console.error("Failed to update announcement:", error);
    return NextResponse.json(
      { error: "更新公告失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireModerator(request);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const announcementId = parseInt(id, 10);
    if (isNaN(announcementId)) {
      return NextResponse.json({ error: "无效的公告ID" }, { status: 400 });
    }

    const db = await initializeDatabase();

    const existingResult = await db.execute({
      sql: "SELECT id FROM announcements WHERE id = ?",
      args: [announcementId],
    });
    if (existingResult.rows.length === 0) {
      return NextResponse.json({ error: "公告不存在" }, { status: 404 });
    }

    await db.execute({
      sql: "DELETE FROM announcements WHERE id = ?",
      args: [announcementId],
    });

    return NextResponse.json({ message: "公告已删除" });
  } catch (error) {
    console.error("Failed to delete announcement:", error);
    return NextResponse.json(
      { error: "删除公告失败" },
      { status: 500 }
    );
  }
}
