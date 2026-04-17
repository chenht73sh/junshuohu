import { NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = initializeDatabase();

    const categories = db
      .prepare(
        `SELECT c.*, 
          (SELECT COUNT(*) FROM posts WHERE category_id = c.id) as post_count
        FROM categories c
        ORDER BY c.sort_order ASC`
      )
      .all();

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return NextResponse.json(
      { error: "获取板块列表失败" },
      { status: 500 }
    );
  }
}
