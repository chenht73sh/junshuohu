import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { addPoints } from "@/lib/points";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const db = await initializeDatabase();

    // Check if user already checked in today
    const todayResult = await db.execute({
      sql: `SELECT id FROM point_records
            WHERE user_id = ? AND action = 'daily_checkin'
            AND DATE(created_at) = DATE('now')`,
      args: [auth.userId],
    });

    if (todayResult.rows.length > 0) {
      return NextResponse.json({ error: "今天已经签到过了，明天再来吧" }, { status: 409 });
    }

    await addPoints(auth.userId, 1, "daily_checkin", "每日签到");

    return NextResponse.json({ message: "签到成功，获得 1 积分！", points: 1 });
  } catch (error) {
    console.error("POST checkin error:", error);
    return NextResponse.json({ error: "签到失败" }, { status: 500 });
  }
}
