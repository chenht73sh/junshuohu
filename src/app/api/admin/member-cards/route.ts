import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const CARD_SESSIONS: Record<string, number> = {
  "10次卡": 10,
  "20次卡": 20,
  "单次": 1,
};

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  const db = await initializeDatabase();

  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (userId) {
    conditions.push("mc.user_id = ?");
    args.push(parseInt(userId, 10));
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await db.execute({
    sql: `
      SELECT
        mc.id,
        mc.user_id,
        mc.card_type,
        mc.total_sessions,
        mc.remaining_sessions,
        mc.purchase_price,
        mc.purchase_date,
        mc.notes,
        mc.created_by,
        mc.created_at,
        u.display_name,
        u.username,
        u.phone,
        creator.display_name AS created_by_name
      FROM member_cards mc
      JOIN users u ON mc.user_id = u.id
      LEFT JOIN users creator ON mc.created_by = creator.id
      ${where}
      ORDER BY mc.created_at DESC
      LIMIT ? OFFSET ?
    `,
    args: [...args, pageSize, offset],
  });

  const countResult = await db.execute({
    sql: `SELECT COUNT(*) as cnt FROM member_cards mc ${where}`,
    args,
  });

  return NextResponse.json({
    cards: rows.rows,
    total: countResult.rows[0].cnt,
    page,
    pageSize,
  });
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { userId, cardType, purchasePrice, notes } = body;

  if (!userId || !cardType || purchasePrice === undefined) {
    return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
  }

  if (!CARD_SESSIONS[cardType]) {
    return NextResponse.json({ error: "无效的次卡类型" }, { status: 400 });
  }

  const totalSessions = CARD_SESSIONS[cardType];

  const db = await initializeDatabase();

  // Verify user exists
  const userResult = await db.execute({
    sql: "SELECT id FROM users WHERE id = ?",
    args: [userId],
  });
  if (userResult.rows.length === 0) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  const result = await db.execute({
    sql: `
      INSERT INTO member_cards (user_id, card_type, total_sessions, remaining_sessions, purchase_price, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    args: [userId, cardType, totalSessions, totalSessions, purchasePrice, notes || null, auth.userId],
  });

  return NextResponse.json({ id: result.lastInsertRowid, message: "次卡录入成功" }, { status: 201 });
}
