import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const imageId = parseInt(id, 10);
    if (isNaN(imageId)) {
      return NextResponse.json({ error: "无效的文件ID" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.execute({
      sql: "SELECT original_name, mime_type, data FROM uploaded_images WHERE id = ?",
      args: [imageId],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "文件不存在" }, { status: 404 });
    }

    const row = result.rows[0];
    const originalName = row.original_name as string;
    const mimeType = row.mime_type as string;
    const base64Data = row.data as string;
    const buffer = Buffer.from(base64Data, "base64");

    const { searchParams } = new URL(request.url);
    const isDownload = searchParams.get("download") === "1";

    const headers: Record<string, string> = {
      "Content-Type": mimeType,
      "Content-Length": buffer.length.toString(),
      "Cache-Control": "public, max-age=31536000, immutable",
    };

    if (isDownload) {
      headers["Content-Disposition"] = `attachment; filename="${encodeURIComponent(originalName)}"`;
    }

    return new NextResponse(buffer, { status: 200, headers });
  } catch (error) {
    console.error("Failed to serve file:", error);
    return NextResponse.json({ error: "获取文件失败" }, { status: 500 });
  }
}
