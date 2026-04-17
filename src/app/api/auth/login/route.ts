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

    const db = initializeDatabase();

    // Find user by username or email
    const user = db
      .prepare(
        "SELECT * FROM users WHERE username = ? OR email = ?"
      )
      .get(username, username) as UserRow | undefined;

    if (!user) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 401 }
      );
    }

    // Compare password
    if (!bcryptjs.compareSync(password, user.password_hash)) {
      return NextResponse.json(
        { error: "密码错误" },
        { status: 401 }
      );
    }

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
