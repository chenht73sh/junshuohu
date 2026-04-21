import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const db = await initializeDatabase();
    const result = await db.execute({
      sql: "SELECT key, value, updated_at FROM site_settings ORDER BY key",
      args: [],
    });

    const settings: Record<string, unknown> = {};
    for (const row of result.rows) {
      const key = row.key as string;
      const value = row.value as string;
      try {
        settings[key] = JSON.parse(value);
      } catch {
        settings[key] = value;
      }
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Failed to fetch admin settings:", error);
    return NextResponse.json({ error: "获取站点设置失败" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: "请提供 key 和 value" }, { status: 400 });
    }

    const db = await initializeDatabase();
    const serialized = typeof value === "string" ? value : JSON.stringify(value);

    await db.execute({
      sql: `INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      args: [key, serialized],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update site setting:", error);
    return NextResponse.json({ error: "更新站点设置失败" }, { status: 500 });
  }
}
