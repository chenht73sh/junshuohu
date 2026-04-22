import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import bcryptjs from "bcryptjs";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "无效用户ID" }, { status: 400 });
    }

    // 只能修改自己的密码（管理员可修改任何人）
    if (auth.userId !== userId && auth.role !== "admin") {
      return NextResponse.json({ error: "无权修改他人密码" }, { status: 403 });
    }

    const body = await request.json();
    const { current_password, new_password } = body;

    if (!new_password || (new_password as string).length < 8) {
      return NextResponse.json({ error: "新密码至少需要8位" }, { status: 400 });
    }
    if ((new_password as string).length > 100) {
      return NextResponse.json({ error: "密码过长" }, { status: 400 });
    }

    const db = await initializeDatabase();

    // 查当前密码哈希
    const userResult = await db.execute({
      sql: "SELECT id, password_hash, role FROM users WHERE id = ?",
      args: [userId],
    });
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    const user = userResult.rows[0];

    // 非管理员必须提供旧密码
    if (auth.role !== "admin") {
      if (!current_password) {
        return NextResponse.json({ error: "请提供当前密码" }, { status: 400 });
      }
      const valid = await bcryptjs.compare(
        current_password as string,
        user.password_hash as string
      );
      if (!valid) {
        return NextResponse.json({ error: "当前密码不正确" }, { status: 401 });
      }
    }

    const newHash = await bcryptjs.hash(new_password as string, 10);

    await db.execute({
      sql: "UPDATE users SET password_hash = ? WHERE id = ?",
      args: [newHash, userId],
    });

    return NextResponse.json({ message: "密码修改成功" });
  } catch (error) {
    console.error("PUT password error:", error);
    return NextResponse.json({ error: "修改密码失败" }, { status: 500 });
  }
}
