import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const db = await initializeDatabase();
    const result = await db.execute({
      sql: `SELECT id, code, created_by, used_by, max_uses, used_count, is_active, note, created_at, used_at
            FROM invite_codes ORDER BY created_at DESC`,
      args: [],
    });

    return NextResponse.json({ invite_codes: result.rows });
  } catch (error) {
    console.error("Failed to fetch invite codes:", error);
    return NextResponse.json({ error: "获取邀请码列表失败" }, { status: 500 });
  }
}

function generateRandomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { max_uses = 1, note = null } = body;

    const db = await initializeDatabase();

    // Generate unique code
    let code = generateRandomCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db.execute({
        sql: "SELECT id FROM invite_codes WHERE code = ?",
        args: [code],
      });
      if (existing.rows.length === 0) break;
      code = generateRandomCode();
      attempts++;
    }

    if (attempts >= 10) {
      return NextResponse.json({ error: "生成邀请码失败，请重试" }, { status: 500 });
    }

    const result = await db.execute({
      sql: `INSERT INTO invite_codes (code, created_by, max_uses, note) VALUES (?, ?, ?, ?)`,
      args: [code, auth.userId, max_uses, note],
    });

    const newCode = await db.execute({
      sql: `SELECT id, code, created_by, used_by, max_uses, used_count, is_active, note, created_at, used_at
            FROM invite_codes WHERE id = ?`,
      args: [result.lastInsertRowid!],
    });

    return NextResponse.json({ invite_code: newCode.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Failed to create invite code:", error);
    return NextResponse.json({ error: "创建邀请码失败" }, { status: 500 });
  }
}
