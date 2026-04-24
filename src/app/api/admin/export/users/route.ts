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
      sql: `SELECT id, username, display_name, email, role, total_points, created_at
            FROM users
            ORDER BY created_at ASC`,
      args: [],
    });

    const BOM = "\uFEFF";
    const header = "ID,用户名,昵称,邮箱,角色,积分,注册时间\r\n";
    const rows = result.rows
      .map((r) =>
        [r.id, r.username, r.display_name, r.email, r.role, r.total_points, r.created_at]
          .map(escapeCSV)
          .join(",")
      )
      .join("\r\n");

    const csv = BOM + header + rows;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="users_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export users error:", error);
    return NextResponse.json({ error: "导出失败" }, { status: 500 });
  }
}
