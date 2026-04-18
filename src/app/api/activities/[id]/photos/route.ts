import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const activityId = parseInt(id, 10);
    if (isNaN(activityId)) return NextResponse.json({ error: "无效ID" }, { status: 400 });

    const db = await initializeDatabase();
    const result = await db.execute({
      sql: `SELECT p.*, u.display_name as uploader_name
            FROM activity_photos p
            LEFT JOIN users u ON u.id = p.uploaded_by
            WHERE p.activity_id = ?
            ORDER BY p.created_at ASC`,
      args: [activityId],
    });

    return NextResponse.json({ photos: result.rows });
  } catch (error) {
    console.error("GET photos error:", error);
    return NextResponse.json({ error: "获取照片失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const activityId = parseInt(id, 10);
    if (isNaN(activityId)) return NextResponse.json({ error: "无效ID" }, { status: 400 });

    const body = await request.json();
    const { image_url, caption } = body;
    if (!image_url) return NextResponse.json({ error: "image_url 为必填项" }, { status: 400 });

    const db = await initializeDatabase();
    const result = await db.execute({
      sql: `INSERT INTO activity_photos (activity_id, image_url, caption, uploaded_by) VALUES (?, ?, ?, ?)`,
      args: [activityId, image_url, caption ?? null, auth.userId],
    });

    return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
  } catch (error) {
    console.error("POST photos error:", error);
    return NextResponse.json({ error: "上传照片失败" }, { status: 500 });
  }
}
