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
    const categoryId = parseInt(id, 10);
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: "无效的板块ID" }, { status: 400 });
    }

    const body = await request.json();
    const db = initializeDatabase();

    const updates: string[] = [];
    const values: unknown[] = [];

    if (typeof body.name === "string" && body.name.trim()) {
      // Check for duplicate name (exclude current)
      const existing = db
        .prepare("SELECT id FROM categories WHERE name = ? AND id != ?")
        .get(body.name.trim(), categoryId);
      if (existing) {
        return NextResponse.json({ error: "已存在同名板块" }, { status: 400 });
      }
      updates.push("name = ?");
      values.push(body.name.trim());
    }
    if (typeof body.description === "string") {
      updates.push("description = ?");
      values.push(body.description.trim());
    }
    if (typeof body.moderator_name === "string") {
      updates.push("moderator_name = ?");
      values.push(body.moderator_name.trim());
    }
    if (typeof body.icon === "string") {
      updates.push("icon = ?");
      values.push(body.icon.trim() || null);
    }
    if (typeof body.color === "string") {
      updates.push("color = ?");
      values.push(body.color.trim() || null);
    }
    if (typeof body.sort_order === "number") {
      updates.push("sort_order = ?");
      values.push(body.sort_order);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "没有需要更新的字段" }, { status: 400 });
    }

    values.push(categoryId);

    const result = db
      .prepare(`UPDATE categories SET ${updates.join(", ")} WHERE id = ?`)
      .run(...values);

    if (result.changes === 0) {
      return NextResponse.json({ error: "板块不存在" }, { status: 404 });
    }

    return NextResponse.json({ message: "板块已更新" });
  } catch (error) {
    console.error("Failed to update category:", error);
    return NextResponse.json({ error: "更新板块失败" }, { status: 500 });
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
    const categoryId = parseInt(id, 10);
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: "无效的板块ID" }, { status: 400 });
    }

    const db = initializeDatabase();

    // Count posts in this category
    const postCount = db
      .prepare("SELECT COUNT(*) as cnt FROM posts WHERE category_id = ?")
      .get(categoryId) as { cnt: number };

    // If client didn't confirm and there are posts, return warning
    const url = new URL(request.url);
    const confirmed = url.searchParams.get("confirmed") === "true";

    if (postCount.cnt > 0 && !confirmed) {
      return NextResponse.json(
        {
          warning: true,
          post_count: postCount.cnt,
          message: `该板块下有 ${postCount.cnt} 篇帖子，删除板块将同时删除所有帖子和评论。`,
        },
        { status: 200 }
      );
    }

    const deleteAll = db.transaction(() => {
      // Delete comments on posts in this category
      db.prepare(
        "DELETE FROM comments WHERE post_id IN (SELECT id FROM posts WHERE category_id = ?)"
      ).run(categoryId);
      // Delete courses in this category
      db.prepare(
        "DELETE FROM enrollments WHERE course_id IN (SELECT id FROM courses WHERE category_id = ?)"
      ).run(categoryId);
      db.prepare("DELETE FROM courses WHERE category_id = ?").run(categoryId);
      // Delete posts in this category
      db.prepare("DELETE FROM posts WHERE category_id = ?").run(categoryId);
      // Delete the category
      return db.prepare("DELETE FROM categories WHERE id = ?").run(categoryId);
    });

    const result = deleteAll();

    if (result.changes === 0) {
      return NextResponse.json({ error: "板块不存在" }, { status: 404 });
    }

    return NextResponse.json({ message: "板块已删除" });
  } catch (error) {
    console.error("Failed to delete category:", error);
    return NextResponse.json({ error: "删除板块失败" }, { status: 500 });
  }
}
