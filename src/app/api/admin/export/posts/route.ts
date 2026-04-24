import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function escapeCSV(value: any): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const db = await initializeDatabase();

    const result = await db.execute({
      sql: `SELECT p.id, p.title, u.display_name as author, c.name as category,
              p.created_at, p.view_count,
              (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
            FROM posts p
            JOIN users u ON u.id = p.author_id
            JOIN categories c ON c.id = p.category_id
            ORDER BY p.created_at DESC`,
      args: [],
    });

    const BOM = "\uFEFF";
    const header = "ID,标题,作者,板块,发布时间,浏览量,回复数\r\n";
    const rows = result.rows
      .map((r) =>
        [r.id, r.title, r.author, r.category, r.created_at, r.view_count, r.comment_count]
          .map(escapeCSV)
          .join(",")
      )
      .join("\r\n");

    const csv = BOM + header + rows;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="posts_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export posts error:", error);
    return NextResponse.json({ error: "导出失败" }, { status: 500 });
  }
}
