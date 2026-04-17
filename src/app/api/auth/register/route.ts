import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { hashPassword, generateToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password, display_name } = body;

    // Validate required fields
    if (!username || !password || !display_name) {
      return NextResponse.json(
        { error: "用户名、密码和显示名为必填项" },
        { status: 400 }
      );
    }

    if (username.length < 2 || username.length > 30) {
      return NextResponse.json(
        { error: "用户名长度应在2-30个字符之间" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "密码长度不能少于6位" },
        { status: 400 }
      );
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "邮箱格式不正确" },
        { status: 400 }
      );
    }

    const db = initializeDatabase();

    // Check username uniqueness
    const existingUsername = db
      .prepare("SELECT id FROM users WHERE username = ?")
      .get(username);
    if (existingUsername) {
      return NextResponse.json(
        { error: "用户名已被注册" },
        { status: 409 }
      );
    }

    // Check email uniqueness (if provided)
    if (email) {
      const existingEmail = db
        .prepare("SELECT id FROM users WHERE email = ?")
        .get(email);
      if (existingEmail) {
        return NextResponse.json(
          { error: "邮箱已被注册" },
          { status: 409 }
        );
      }
    }

    // Hash password and insert
    const passwordHash = hashPassword(password);

    const result = db
      .prepare(
        `INSERT INTO users (username, email, password_hash, display_name, role)
         VALUES (?, ?, ?, ?, 'member')`
      )
      .run(username, email || null, passwordHash, display_name);

    const user = db
      .prepare(
        `SELECT id, username, email, display_name, avatar_url, role, bio, created_at
         FROM users WHERE id = ?`
      )
      .get(result.lastInsertRowid) as {
      id: number;
      username: string;
      email: string | null;
      display_name: string;
      avatar_url: string | null;
      role: string;
      bio: string | null;
      created_at: string;
    };

    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    return NextResponse.json({ token, user }, { status: 201 });
  } catch (error) {
    console.error("Failed to register:", error);
    return NextResponse.json(
      { error: "注册失败，请稍后重试" },
      { status: 500 }
    );
  }
}
