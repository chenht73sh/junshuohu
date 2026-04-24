// GET /api/search?q=关键词&page=1&limit=10&categoryId=1
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") ?? "10")));
  const categoryId = searchParams.get("categoryId");

  if (!q) return NextResponse.json({ error: "请输入搜索关键词" }, { status: 400 });
  if (q.length > 100) return NextResponse.json({ error: "关键词过长" }, { status: 400 });

  const db = await getDb();
  const offset = (page - 1) * limit;
  const pattern = `%${q}%`;

  let whereClause = "(p.title LIKE ? OR p.content LIKE ?)";
  let args: (string | number)[] = [pattern, pattern];

  if (categoryId) {
    whereClause += " AND p.category_id = ?";
    args.push(parseInt(categoryId));
  }

  const countResult = await db.execute({
    sql: `SELECT COUNT(*) as total FROM posts p WHERE ${whereClause}`,
    args,
  });
  const total = countResult.rows[0].total as number;

  const results = await db.execute({
    sql: `SELECT 
            p.id, p.title, 
            SUBSTR(p.content, 1, 200) as content,
            p.is_pinned, p.is_featured, p.view_count,
            p.created_at,
            u.username as author_username,
            u.display_name as author_display_name,
            c.id as category_id,
            c.name as category_name,
            c.color as category_color,
            (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
          FROM posts p
          JOIN users u ON p.author_id = u.id
          JOIN categories c ON p.category_id = c.id
          WHERE ${whereClause}
          ORDER BY p.is_pinned DESC, p.created_at DESC
          LIMIT ? OFFSET ?`,
    args: [...args, limit, offset],
  });

  return NextResponse.json({
    results: results.rows,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    query: q,
  });
}
