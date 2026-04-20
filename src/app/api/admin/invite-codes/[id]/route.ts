import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const db = await initializeDatabase();

    const existing = await db.execute({
      sql: "SELECT id FROM invite_codes WHERE id = ?",
      args: [id],
    });
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "邀请码不存在" }, { status: 404 });
    }

    await db.execute({
      sql: "UPDATE invite_codes SET is_active = 0 WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to deactivate invite code:", error);
    return NextResponse.json({ error: "作废邀请码失败" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const db = await initializeDatabase();

    const existing = await db.execute({
      sql: "SELECT id FROM invite_codes WHERE id = ?",
      args: [id],
    });
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "邀请码不存在" }, { status: 404 });
    }

    await db.execute({
      sql: "DELETE FROM invite_codes WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete invite code:", error);
    return NextResponse.json({ error: "删除邀请码失败" }, { status: 500 });
  }
}
