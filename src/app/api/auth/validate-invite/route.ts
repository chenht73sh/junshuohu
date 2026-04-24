import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/validate-invite
 * Public endpoint — validates whether an invite code is usable.
 * Returns only validity status, no sensitive info.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ valid: false, message: "邀请码不能为空" }, { status: 400 });
    }

    const db = await initializeDatabase();

    const result = await db.execute({
      sql: `SELECT id, max_uses, used_count, is_active
            FROM invite_codes
            WHERE code = ? AND is_active = 1 AND used_count < max_uses`,
      args: [code.trim().toUpperCase()],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ valid: false, message: "邀请码无效或已使用完" });
    }

    return NextResponse.json({ valid: true, message: "邀请码有效" });
  } catch (error) {
    console.error("validate-invite error:", error);
    return NextResponse.json({ valid: false, message: "验证失败，请稍后重试" }, { status: 500 });
  }
}
