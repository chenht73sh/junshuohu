import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) return NextResponse.json({ error: "无效用户ID" }, { status: 400 });

    const db = await initializeDatabase();
    const userResult = await db.execute({
      sql: `SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio, u.role, u.created_at, u.total_points,
                   p.avatar as profile_avatar, p.bio as profile_bio, p.interests, p.expertise
            FROM users u
            LEFT JOIN user_profiles p ON p.user_id = u.id
            WHERE u.id = ?`,
      args: [userId],
    });

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    return NextResponse.json({ profile: userResult.rows[0] });
  } catch (error) {
    console.error("GET profile error:", error);
    return NextResponse.json({ error: "获取档案失败" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) return NextResponse.json({ error: "无效用户ID" }, { status: 400 });

    // Users can only edit their own profile (admins can edit anyone)
    if (auth.userId !== userId && auth.role !== "admin") {
      return NextResponse.json({ error: "无权编辑他人档案" }, { status: 403 });
    }

    const body = await request.json();
    const { avatar, bio, interests, expertise, display_name } = body;

    const db = await initializeDatabase();

    // Upsert user_profiles
    await db.execute({
      sql: `INSERT INTO user_profiles (user_id, avatar, bio, interests, expertise, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id) DO UPDATE SET
              avatar = COALESCE(excluded.avatar, avatar),
              bio = COALESCE(excluded.bio, bio),
              interests = COALESCE(excluded.interests, interests),
              expertise = COALESCE(excluded.expertise, expertise),
              updated_at = CURRENT_TIMESTAMP`,
      args: [userId, avatar ?? null, bio ?? null, interests ?? null, expertise ?? null],
    });

    // Optionally update display_name in users table
    if (display_name) {
      await db.execute({
        sql: "UPDATE users SET display_name = ? WHERE id = ?",
        args: [display_name, userId],
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH profile error:", error);
    return NextResponse.json({ error: "更新档案失败" }, { status: 500 });
  }
}
