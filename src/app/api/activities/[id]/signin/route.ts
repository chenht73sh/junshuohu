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

    // Check activity exists
    const activityResult = await db.execute({
      sql: "SELECT id, title, status FROM activities WHERE id = ?",
      args: [activityId],
    });
    if (activityResult.rows.length === 0) {
      return NextResponse.json({ error: "活动不存在" }, { status: 404 });
    }

    // Check participant is registered
    const participantResult = await db.execute({
      sql: "SELECT id, signed_in FROM activity_participants WHERE activity_id = ? AND user_id = ?",
      args: [activityId, auth.userId],
    });
    if (participantResult.rows.length === 0) {
      return NextResponse.json({ error: "您未报名该活动，无法签到" }, { status: 403 });
    }

    const participant = participantResult.rows[0] as unknown as { id: number; signed_in: number };
    if (participant.signed_in === 1) {
      return NextResponse.json({ error: "您已签到过了" }, { status: 409 });
    }

    await db.execute({
      sql: "UPDATE activity_participants SET signed_in = 1, signed_in_at = CURRENT_TIMESTAMP WHERE activity_id = ? AND user_id = ?",
      args: [activityId, auth.userId],
    });

    const activity = activityResult.rows[0] as unknown as { title: string };
    await addPoints(auth.userId, 5, "activity_signin", `活动签到：${activity.title}`, activityId, "activity");

    return NextResponse.json({ message: "签到成功" });
  } catch (error) {
    console.error("POST signin error:", error);
    return NextResponse.json({ error: "签到失败" }, { status: 500 });
  }
}
