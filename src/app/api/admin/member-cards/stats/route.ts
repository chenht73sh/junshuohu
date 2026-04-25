import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const db = await initializeDatabase();

  // Overall card stats
  const overallResult = await db.execute({
    sql: `
      SELECT
        COUNT(*) AS total_cards,
        COALESCE(SUM(total_sessions), 0) AS total_sessions,
        COALESCE(SUM(total_sessions - remaining_sessions), 0) AS used_sessions,
        COALESCE(SUM(remaining_sessions), 0) AS remaining_sessions,
        COUNT(DISTINCT user_id) AS card_holders
      FROM member_cards
    `,
    args: [],
  });

  // By card type
  const byTypeResult = await db.execute({
    sql: `
      SELECT card_type, COUNT(*) AS count, SUM(total_sessions) AS total, SUM(remaining_sessions) AS remaining
      FROM member_cards
      GROUP BY card_type
    `,
    args: [],
  });

  // Monthly enrollment count (this month)
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthlyResult = await db.execute({
    sql: `
      SELECT COUNT(*) AS monthly_enrollments
      FROM enrollments
      WHERE created_at >= ?
    `,
    args: [monthStart],
  });

  // Course enrollment stats with card info
  const courseStatsResult = await db.execute({
    sql: `
      SELECT
        c.id AS course_id,
        c.title AS course_title,
        c.start_time,
        COUNT(e.id) AS total_enrollments,
        SUM(CASE WHEN e.payment_type = '次卡' OR e.payment_type IS NULL THEN 1 ELSE 0 END) AS card_enrollments,
        SUM(CASE WHEN e.payment_type = '单次' THEN 1 ELSE 0 END) AS single_enrollments,
        COALESCE(SUM(e.guest_count), 0) AS total_guests
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id
      GROUP BY c.id, c.title, c.start_time
      ORDER BY c.start_time DESC
    `,
    args: [],
  });

  const overall = overallResult.rows[0] as unknown as {
    total_cards: number;
    total_sessions: number;
    used_sessions: number;
    remaining_sessions: number;
    card_holders: number;
  };

  return NextResponse.json({
    overall,
    byType: byTypeResult.rows,
    monthly: monthlyResult.rows[0],
    courseStats: courseStatsResult.rows,
  });
}
