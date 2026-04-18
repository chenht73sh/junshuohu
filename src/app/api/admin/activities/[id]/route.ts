import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const activityId = parseInt(id, 10);
    if (isNaN(activityId)) return NextResponse.json({ error: "无效ID" }, { status: 400 });

    const db = await initializeDatabase();
    const body = await request.json();
    const {
      title, description, category_id, speaker, location,
      activity_date, start_time, end_time, max_participants,
      cover_image, summary, status,
    } = body;

    await db.execute({
      sql: `UPDATE activities SET
        title = COALESCE(?, title),
        description = ?,
        category_id = ?,
        speaker = ?,
        location = ?,
        activity_date = COALESCE(?, activity_date),
        start_time = ?,
        end_time = ?,
        max_participants = ?,
        cover_image = ?,
        summary = ?,
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      args: [
        title ?? null, description ?? null, category_id ?? null,
        speaker ?? null, location ?? null, activity_date ?? null,
        start_time ?? null, end_time ?? null, max_participants ?? null,
        cover_image ?? null, summary ?? null, status ?? null,
        activityId,
      ],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/admin/activities/[id] error:", error);
    return NextResponse.json({ error: "更新活动失败" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const activityId = parseInt(id, 10);
    if (isNaN(activityId)) return NextResponse.json({ error: "无效ID" }, { status: 400 });

    const db = await initializeDatabase();
    await db.batch([
      { sql: "DELETE FROM activity_participants WHERE activity_id = ?", args: [activityId] },
      { sql: "DELETE FROM activity_photos WHERE activity_id = ?", args: [activityId] },
      { sql: "DELETE FROM activity_materials WHERE activity_id = ?", args: [activityId] },
      { sql: "DELETE FROM activities WHERE id = ?", args: [activityId] },
    ], "write");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/activities/[id] error:", error);
    return NextResponse.json({ error: "删除活动失败" }, { status: 500 });
  }
}
