import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { hashPassword, generateToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

const VALID_INVITE_CODE = "junshuohu2026";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password, display_name, phone, invite_code } = body;

    // Validate invite code
    if (!invite_code || invite_code !== VALID_INVITE_CODE) {
      return NextResponse.json(
        { error: "邀请码不正确，如无邀请码请联系社群管理员获取" },
        { status: 403 }
      );
    }

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

    const db = await initializeDatabase();

    // Check username uniqueness
    const existingUsername = await db.execute({
      sql: "SELECT id FROM users WHERE username = ?",
      args: [username],
    });
    if (existingUsername.rows.length > 0) {
      return NextResponse.json(
        { error: "用户名已被注册" },
        { status: 409 }
      );
    }

    // Check email uniqueness (if provided)
    if (email) {
      const existingEmail = await db.execute({
        sql: "SELECT id FROM users WHERE email = ?",
        args: [email],
      });
      if (existingEmail.rows.length > 0) {
        return NextResponse.json(
          { error: "邮箱已被注册" },
          { status: 409 }
        );
      }
    }

    // Hash password and insert
    const passwordHash = hashPassword(password);

    const result = await db.execute({
      sql: `INSERT INTO users (username, email, password_hash, display_name, phone, role)
            VALUES (?, ?, ?, ?, ?, 'member')`,
      args: [username, email || null, passwordHash, display_name, phone || null],
    });

    const userResult = await db.execute({
      sql: `SELECT id, username, email, display_name, avatar_url, role, bio, created_at
            FROM users WHERE id = ?`,
      args: [result.lastInsertRowid!],
    });

    const user = userResult.rows[0] as unknown as {
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
