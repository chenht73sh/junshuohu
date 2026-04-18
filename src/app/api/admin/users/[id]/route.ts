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
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "无效的用户ID" }, { status: 400 });
    }

    const body = await request.json();
    const { role } = body;

    if (!role || !["admin", "moderator", "member"].includes(role)) {
      return NextResponse.json(
        { error: "无效的角色，可选值：admin、moderator、member" },
        { status: 400 }
      );
    }

    // Prevent demoting self
    if (userId === auth.userId && role !== "admin") {
      return NextResponse.json(
        { error: "不能修改自己的角色" },
        { status: 400 }
      );
    }

    const db = await initializeDatabase();
    const result = await db.execute({
      sql: "UPDATE users SET role = ? WHERE id = ?",
      args: [role, userId],
    });

    if (result.rowsAffected === 0) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    return NextResponse.json({ message: "角色已更新" });
  } catch (error) {
    console.error("Failed to update user role:", error);
    return NextResponse.json({ error: "修改角色失败" }, { status: 500 });
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
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "无效的用户ID" }, { status: 400 });
    }

    // Prevent deleting self
    if (userId === auth.userId) {
      return NextResponse.json(
        { error: "不能删除自己的账号" },
        { status: 400 }
      );
    }

    const db = await initializeDatabase();
    const result = await db.execute({
      sql: "DELETE FROM users WHERE id = ?",
      args: [userId],
    });

    if (result.rowsAffected === 0) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    return NextResponse.json({ message: "用户已删除" });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json({ error: "删除用户失败" }, { status: 500 });
  }
}
