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
    const requestId = parseInt(id, 10);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: "无效的申请ID" }, { status: 400 });
    }

    const db = await initializeDatabase();
    await db.execute({
      sql: `UPDATE password_reset_requests SET status = 'handled', handled_at = datetime('now') WHERE id = ?`,
      args: [requestId],
    });

    return NextResponse.json({ message: "已标记为处理完成" });
  } catch (error) {
    console.error("PATCH password-resets error:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
