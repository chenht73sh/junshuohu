import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const db = await initializeDatabase();
    const { searchParams } = new URL(request.url);

    const singleKey = searchParams.get("key");
    const multiKeys = searchParams.get("keys");

    if (!singleKey && !multiKeys) {
      return NextResponse.json({ error: "请提供 key 或 keys 参数" }, { status: 400 });
    }

    const keys = singleKey ? [singleKey] : multiKeys!.split(",").map((k) => k.trim()).filter(Boolean);

    if (keys.length === 0) {
      return NextResponse.json({ settings: {} });
    }

    const placeholders = keys.map(() => "?").join(",");
    const result = await db.execute({
      sql: `SELECT key, value FROM site_settings WHERE key IN (${placeholders})`,
      args: keys,
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
    console.error("Failed to fetch site settings:", error);
    return NextResponse.json({ error: "获取站点设置失败" }, { status: 500 });
  }
}
