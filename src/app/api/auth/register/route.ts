import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { hashPassword, generateToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password, display_name, phone, invite_code } = body;

    // Validate required fields
    if (!username || !password || !display_name || !phone) {
      return NextResponse.json(
        { error: "用户名、密码、显示名和手机号为必填项" },
        { status: 400 }
      );
    }

    // Validate phone format
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: "手机号格式不正确" },
        { status: 400 }
      );
    }

    // 注册速率限制：1小时内同IP不超过5次注册尝试（信任链修复）
    const ip =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-real-ip") ??
      request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ??
      "unknown";
    const db = await initializeDatabase();
    const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const registerAttempts = await db.execute({
      sql: `SELECT COUNT(*) as cnt FROM login_attempts WHERE ip = ? AND created_at > ? AND success = 2`,
      args: [ip, windowStart],
    });
    if ((registerAttempts.rows[0].cnt as number) >= 5) {
      return NextResponse.json({ error: "注册过于频繁，请稍后再试" }, { status: 429 });
    }

    // Validate invite code
    if (!invite_code) {
      return NextResponse.json(
        { error: "邀请码无效或已使用，请联系管理员获取" },
        { status: 403 }
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

    // Validate invite code against database
    const codeResult = await db.execute({
      sql: `SELECT id, max_uses, used_count, is_active FROM invite_codes
            WHERE code = ? AND is_active = 1 AND used_count < max_uses`,
      args: [invite_code.toUpperCase()],
    });
    if (codeResult.rows.length === 0) {
      return NextResponse.json(
        { error: "邀请码无效或已使用，请联系管理员获取" },
        { status: 403 }
      );
    }
    const inviteCode = codeResult.rows[0] as unknown as {
      id: number;
      max_uses: number;
      used_count: number;
      is_active: number;
    };

    // Check username uniqueness
    const existingUsername = await db.execute({
      sql: "SELECT id FROM users WHERE username = ?",
      args: [username],
    });
    if (existingUsername.rows.length > 0) {
      return NextResponse.json(
        { error: "该信息已被使用" },
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
          { error: "该信息已被使用" },
          { status: 409 }
        );
      }
    }

    // Hash password and insert
    const passwordHash = hashPassword(password);

    const result = await db.execute({
      sql: `INSERT INTO users (username, email, password_hash, display_name, phone, role)
            VALUES (?, ?, ?, ?, ?, 'member')`,
      args: [username, email || null, passwordHash, display_name, phone],
    });

    const newUserId = result.lastInsertRowid!;

    // 记录注册尝试（success=2 表示注册成功）
    await db.execute({
      sql: "INSERT INTO login_attempts (ip, username, success) VALUES (?, ?, 2)",
      args: [ip, username],
    });

    // Update invite code usage
    const newUsedCount = inviteCode.used_count + 1;
    const shouldDeactivate = inviteCode.max_uses === 1 || newUsedCount >= inviteCode.max_uses;
    await db.execute({
      sql: `UPDATE invite_codes SET used_count = used_count + 1, used_by = ?, used_at = datetime('now')${shouldDeactivate ? ", is_active = 0" : ""} WHERE id = ?`,
      args: [newUserId, inviteCode.id],
    });

    const userResult = await db.execute({
      sql: `SELECT id, username, email, display_name, avatar_url, role, bio, created_at
            FROM users WHERE id = ?`,
      args: [newUserId],
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
