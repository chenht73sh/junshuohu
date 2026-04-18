import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireModerator } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireModerator(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
      return NextResponse.json({ error: "无效的帖子ID" }, { status: 400 });
    }

    const body = await request.json();
    const db = await initializeDatabase();

    // Build dynamic SET clause
    const updates: string[] = [];
    const values: unknown[] = [];

    if (typeof body.is_pinned === "number") {
      updates.push("is_pinned = ?");
      values.push(body.is_pinned);
    }
    if (typeof body.is_featured === "number") {
      updates.push("is_featured = ?");
      values.push(body.is_featured);
    }
    if (typeof body.title === "string" && body.title.trim()) {
      updates.push("title = ?");
      values.push(body.title.trim());
    }
    if (typeof body.content === "string" && body.content.trim()) {
      updates.push("content = ?");
      values.push(body.content.trim());
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "没有需要更新的字段" }, { status: 400 });
    }

    updates.push("updated_at = datetime('now')");
    values.push(postId);

    const result = await db.execute({
      sql: `UPDATE posts SET ${updates.join(", ")} WHERE id = ?`,
      args: values as (string | number | null)[],
    });

    if (result.rowsAffected === 0) {
      return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
    }

    return NextResponse.json({ message: "帖子已更新" });
  } catch (error) {
    console.error("Failed to update post:", error);
    return NextResponse.json({ error: "更新帖子失败" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireModerator(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
      return NextResponse.json({ error: "无效的帖子ID" }, { status: 400 });
    }

    const db = await initializeDatabase();

    // Delete comments first (foreign key), then the post
    await db.batch([
      { sql: "DELETE FROM comments WHERE post_id = ?", args: [postId] },
      { sql: "DELETE FROM posts WHERE id = ?", args: [postId] },
    ], "write");

    return NextResponse.json({ message: "帖子已删除" });
  } catch (error) {
    console.error("Failed to delete post:", error);
    return NextResponse.json({ error: "删除帖子失败" }, { status: 500 });
  }
}
