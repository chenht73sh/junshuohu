import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username_or_email } = body;

    if (!username_or_email || !username_or_email.trim()) {
      return NextResponse.json({ error: "请输入用户名或邮箱" }, { status: 400 });
    }

    const db = await initializeDatabase();

    await db.execute({
      sql: `INSERT INTO password_reset_requests (username_or_email) VALUES (?)`,
      args: [username_or_email.trim()],
    });

    return NextResponse.json({ message: "密码重置申请已提交，请联系管理员（微信：junshuohu）获取新密码" });
  } catch (error) {
    console.error("forgot-password error:", error);
    return NextResponse.json({ error: "提交失败，请稍后重试" }, { status: 500 });
  }
}
