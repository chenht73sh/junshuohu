import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { generateToken, type UserRow } from "@/lib/auth";
import bcryptjs from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "请输入用户名/邮箱和密码" },
        { status: 400 }
      );
    }

    // 获取IP（信任链修复）
    const ip =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-real-ip") ??
      request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ??
      "unknown";

    const db = await initializeDatabase();

    // 查15分钟内失败次数（暴力破解限流）
    const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const attemptsResult = await db.execute({
      sql: `SELECT COUNT(*) as cnt FROM login_attempts WHERE ip = ? AND created_at > ? AND success = 0`,
      args: [ip, windowStart],
    });
    if ((attemptsResult.rows[0].cnt as number) >= 10) {
      return NextResponse.json({ error: "尝试次数过多，请15分钟后再试" }, { status: 429 });
    }

    // Find user by username or email — 显式列举字段，不返回手机号
    const result = await db.execute({
      sql: `SELECT id, username, email, password_hash, display_name, avatar_url, role, bio, created_at, total_points
            FROM users WHERE username = ? OR email = ?`,
      args: [username, username],
    });

    if (result.rows.length === 0) {
      // 记录失败尝试
      await db.execute({
        sql: "INSERT INTO login_attempts (ip, username, success) VALUES (?, ?, 0)",
        args: [ip, username],
      });
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    const user = result.rows[0] as unknown as UserRow & { total_points: number };

    // Compare password
    if (!bcryptjs.compareSync(password, user.password_hash)) {
      // 记录失败尝试
      await db.execute({
        sql: "INSERT INTO login_attempts (ip, username, success) VALUES (?, ?, 0)",
        args: [ip, username],
      });
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    // 记录成功登录
    await db.execute({
      sql: "INSERT INTO login_attempts (ip, username, success) VALUES (?, ?, 1)",
      args: [ip, username],
    });

    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    const { password_hash: _, ...safeUser } = user;

    return NextResponse.json({ token, user: safeUser });
  } catch (error) {
    console.error("Failed to login:", error);
    return NextResponse.json(
      { error: "登录失败，请稍后重试" },
      { status: 500 }
    );
  }
}
