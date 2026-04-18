import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const filter = searchParams.get("filter") || "all";
    const category = searchParams.get("category") || "";

    const db = await initializeDatabase();

    // Build WHERE clauses
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter === "pinned") {
      conditions.push("p.is_pinned = 1");
    } else if (filter === "featured") {
      conditions.push("p.is_featured = 1");
    }

    if (category && category !== "all") {
      const categoryId = parseInt(category, 10);
      if (!isNaN(categoryId)) {
        conditions.push("p.category_id = ?");
        params.push(categoryId);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countResult = await db.execute({
      sql: `SELECT COUNT(*) as total FROM posts p ${whereClause}`,
      args: params,
    });
    const totalCount = countResult.rows[0].total as number;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const offset = (page - 1) * limit;

    // Fetch posts with author, category, comment count, and last reply time
    const postsResult = await db.execute({
      sql: `SELECT p.*,
        u.display_name as author_name,
        c.name as category_name,
        c.color as category_color,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        COALESCE(
          (SELECT MAX(created_at) FROM comments WHERE post_id = p.id),
          p.created_at
        ) as last_reply_time
      FROM posts p
      JOIN users u ON p.author_id = u.id
      JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY p.is_pinned DESC, last_reply_time DESC
      LIMIT ? OFFSET ?`,
      args: [...params, limit, offset],
    });

    return NextResponse.json({
      posts: postsResult.rows,
      total: totalCount,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error("Failed to fetch posts:", error);
    return NextResponse.json(
      { error: "获取帖子列表失败" },
      { status: 500 }
    );
  }
}
