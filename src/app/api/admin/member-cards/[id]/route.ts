import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const cardId = parseInt(id, 10);
  if (isNaN(cardId)) return NextResponse.json({ error: "无效的ID" }, { status: 400 });

  const db = await initializeDatabase();

  const cardResult = await db.execute({
    sql: `
      SELECT mc.*, u.display_name, u.username, u.phone,
             creator.display_name AS created_by_name
      FROM member_cards mc
      JOIN users u ON mc.user_id = u.id
      LEFT JOIN users creator ON mc.created_by = creator.id
      WHERE mc.id = ?
    `,
    args: [cardId],
  });

  if (cardResult.rows.length === 0) {
    return NextResponse.json({ error: "次卡不存在" }, { status: 404 });
  }

  const txResult = await db.execute({
    sql: `
      SELECT ct.*, c.title AS course_title
      FROM card_transactions ct
      LEFT JOIN courses c ON ct.course_id = c.id
      WHERE ct.card_id = ?
      ORDER BY ct.created_at DESC
    `,
    args: [cardId],
  });

  return NextResponse.json({
    card: cardResult.rows[0],
    transactions: txResult.rows,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const cardId = parseInt(id, 10);
  if (isNaN(cardId)) return NextResponse.json({ error: "无效的ID" }, { status: 400 });

  const body = await request.json();
  const { adjustment, notes } = body;

  if (adjustment === undefined || adjustment === 0) {
    return NextResponse.json({ error: "调整量不能为0" }, { status: 400 });
  }

  const db = await initializeDatabase();

  const cardResult = await db.execute({
    sql: "SELECT id, user_id, remaining_sessions, total_sessions FROM member_cards WHERE id = ?",
    args: [cardId],
  });

  if (cardResult.rows.length === 0) {
    return NextResponse.json({ error: "次卡不存在" }, { status: 404 });
  }

  const card = cardResult.rows[0] as unknown as { id: number; user_id: number; remaining_sessions: number; total_sessions: number };
  const newRemaining = card.remaining_sessions + adjustment;

  if (newRemaining < 0) {
    return NextResponse.json({ error: "调整后余额不能为负数" }, { status: 400 });
  }

  await db.batch([
    {
      sql: "UPDATE member_cards SET remaining_sessions = ? WHERE id = ?",
      args: [newRemaining, cardId],
    },
    {
      sql: `INSERT INTO card_transactions (card_id, user_id, sessions_deducted, guest_count, transaction_type, notes)
            VALUES (?, ?, ?, 0, '管理员调整', ?)`,
      args: [cardId, card.user_id, adjustment, notes || `管理员调整 ${adjustment > 0 ? "+" : ""}${adjustment} 次`],
    },
  ], "write");

  return NextResponse.json({ message: "余额调整成功", newRemaining });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const cardId = parseInt(id, 10);
  if (isNaN(cardId)) return NextResponse.json({ error: "无效的ID" }, { status: 400 });

  const db = await initializeDatabase();

  const cardResult = await db.execute({
    sql: "SELECT id, remaining_sessions, total_sessions FROM member_cards WHERE id = ?",
    args: [cardId],
  });

  if (cardResult.rows.length === 0) {
    return NextResponse.json({ error: "次卡不存在" }, { status: 404 });
  }

  const card = cardResult.rows[0] as unknown as { id: number; remaining_sessions: number; total_sessions: number };

  if (card.remaining_sessions !== card.total_sessions) {
    return NextResponse.json(
      { error: "次卡已被使用，无法删除。如需处理请联系管理员手动调整。" },
      { status: 400 }
    );
  }

  await db.execute({ sql: "DELETE FROM member_cards WHERE id = ?", args: [cardId] });

  return NextResponse.json({ message: "次卡已删除" });
}
