import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const activityId = parseInt(id, 10);
    if (isNaN(activityId)) return NextResponse.json({ error: "无效ID" }, { status: 400 });

    const db = await initializeDatabase();
    const activityResult = await db.execute({
      sql: `SELECT
        a.*,
        c.name as category_name,
        c.color as category_color,
        u.display_name as creator_name,
        (SELECT COUNT(*) FROM activity_participants WHERE activity_id = a.id) as participant_count,
        (SELECT COUNT(*) FROM activity_participants WHERE activity_id = a.id AND signed_in = 1) as signed_in_count
      FROM activities a
      LEFT JOIN categories c ON c.id = a.category_id
      LEFT JOIN users u ON u.id = a.created_by
      WHERE a.id = ?`,
      args: [activityId],
    });

    if (activityResult.rows.length === 0) return NextResponse.json({ error: "活动不存在" }, { status: 404 });

    const photosResult = await db.execute({
      sql: `SELECT p.*, u.display_name as uploader_name
      FROM activity_photos p
      LEFT JOIN users u ON u.id = p.uploaded_by
      WHERE p.activity_id = ?
      ORDER BY p.created_at ASC`,
      args: [activityId],
    });

    const materialsResult = await db.execute({
      sql: `SELECT m.*, u.display_name as uploader_name
      FROM activity_materials m
      LEFT JOIN users u ON u.id = m.uploaded_by
      WHERE m.activity_id = ?
      ORDER BY m.created_at ASC`,
      args: [activityId],
    });

    const participantsResult = await db.execute({
      sql: `SELECT ap.*, u.display_name, u.username, u.avatar_url
      FROM activity_participants ap
      JOIN users u ON u.id = ap.user_id
      WHERE ap.activity_id = ?
      ORDER BY ap.created_at ASC`,
      args: [activityId],
    });

    return NextResponse.json({
      activity: activityResult.rows[0],
      photos: photosResult.rows,
      materials: materialsResult.rows,
      participants: participantsResult.rows,
    });
  } catch (error) {
    console.error("GET /api/activities/[id] error:", error);
    return NextResponse.json({ error: "获取活动详情失败" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const activityId = parseInt(id, 10);
    if (isNaN(activityId)) return NextResponse.json({ error: "无效ID" }, { status: 400 });

    const db = await initializeDatabase();
    const existingResult = await db.execute({
      sql: "SELECT id FROM activities WHERE id = ?",
      args: [activityId],
    });
    if (existingResult.rows.length === 0) return NextResponse.json({ error: "活动不存在" }, { status: 404 });

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
        title || null,
        description ?? null,
        category_id ?? null,
        speaker ?? null,
        location ?? null,
        activity_date || null,
        start_time ?? null,
        end_time ?? null,
        max_participants ?? null,
        cover_image ?? null,
        summary ?? null,
        status || null,
        activityId,
      ],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/activities/[id] error:", error);
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
    console.error("DELETE /api/activities/[id] error:", error);
    return NextResponse.json({ error: "删除活动失败" }, { status: 500 });
  }
}
