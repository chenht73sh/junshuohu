import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { addPoints } from "@/lib/points";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const activityId = parseInt(id, 10);
    if (isNaN(activityId)) return NextResponse.json({ error: "无效ID" }, { status: 400 });

    const db = await initializeDatabase();

    const activityResult = await db.execute({
      sql: "SELECT id, title, max_participants, status FROM activities WHERE id = ?",
      args: [activityId],
    });

    if (activityResult.rows.length === 0) return NextResponse.json({ error: "活动不存在" }, { status: 404 });

    const activity = activityResult.rows[0] as unknown as {
      id: number;
      title: string;
      max_participants: number | null;
      status: string;
    };

    if (activity.status === "cancelled") return NextResponse.json({ error: "活动已取消" }, { status: 400 });
    if (activity.status === "completed") return NextResponse.json({ error: "活动已结束，无法报名" }, { status: 400 });

    const existingResult = await db.execute({
      sql: "SELECT id FROM activity_participants WHERE activity_id = ? AND user_id = ?",
      args: [activityId, auth.userId],
    });
    if (existingResult.rows.length > 0) return NextResponse.json({ error: "您已报名该活动" }, { status: 409 });

    if (activity.max_participants !== null) {
      const countResult = await db.execute({
        sql: "SELECT COUNT(*) as cnt FROM activity_participants WHERE activity_id = ?",
        args: [activityId],
      });
      const count = countResult.rows[0].cnt as number;
      if (count >= activity.max_participants) {
        return NextResponse.json({ error: "活动名额已满" }, { status: 400 });
      }
    }

    await db.execute({
      sql: "INSERT INTO activity_participants (activity_id, user_id) VALUES (?, ?)",
      args: [activityId, auth.userId],
    });

    await addPoints(auth.userId, 10, "activity_join", `报名活动：${activity.title}`, activityId, "activity");

    return NextResponse.json({ message: `已成功报名「${activity.title}」` }, { status: 201 });
  } catch (error) {
    console.error("POST participate error:", error);
    return NextResponse.json({ error: "报名失败" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const activityId = parseInt(id, 10);
    if (isNaN(activityId)) return NextResponse.json({ error: "无效ID" }, { status: 400 });

    const db = await initializeDatabase();
    const result = await db.execute({
      sql: "DELETE FROM activity_participants WHERE activity_id = ? AND user_id = ?",
      args: [activityId, auth.userId],
    });

    if (result.rowsAffected === 0) {
      return NextResponse.json({ error: "您未报名该活动" }, { status: 404 });
    }

    return NextResponse.json({ message: "已取消报名" });
  } catch (error) {
    console.error("DELETE participate error:", error);
    return NextResponse.json({ error: "取消报名失败" }, { status: 500 });
  }
}
