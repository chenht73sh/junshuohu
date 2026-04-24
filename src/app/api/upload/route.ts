import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { JwtPayload } from "@/lib/auth";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ATTACHMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed",
];

const IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ATTACHMENT_MAX_SIZE = 20 * 1024 * 1024; // 20MB

function getExtFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "application/vnd.ms-powerpoint": ".ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
    "application/zip": ".zip",
    "application/x-zip-compressed": ".zip",
  };
  return map[mime] || ".bin";
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const _user = authResult as JwtPayload;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const fileType = formData.get("type") as string | null; // "image" or "attachment"

    if (!file) {
      return NextResponse.json({ error: "未选择文件" }, { status: 400 });
    }

    const isImage = fileType === "image";
    const allowedTypes = isImage ? IMAGE_TYPES : ATTACHMENT_TYPES;
    const maxSize = isImage ? IMAGE_MAX_SIZE : ATTACHMENT_MAX_SIZE;

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: isImage ? "不支持的图片格式，请上传 JPG/PNG/GIF/WebP" : "不支持的文件格式" },
        { status: 400 }
      );
    }

    if (file.size > maxSize) {
      const limitMB = maxSize / (1024 * 1024);
      return NextResponse.json(
        { error: `文件大小不能超过 ${limitMB}MB` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Magic bytes validation
    const MAGIC: Record<string, number[][]> = {
      "image/jpeg": [[0xFF, 0xD8, 0xFF]],
      "image/png":  [[0x89, 0x50, 0x4E, 0x47]],
      "image/gif":  [[0x47, 0x49, 0x46, 0x38]],
      "image/webp": [[0x52, 0x49, 0x46, 0x46]],
      "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
    };
    // ZIP-based formats (docx, xlsx, pptx, zip)
    const ZIP_MAGIC = [0x50, 0x4B];
    const ZIP_TYPES = new Set([
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/zip",
      "application/x-zip-compressed",
    ]);

    const header = Array.from(buffer.slice(0, 12));
    if (MAGIC[file.type]) {
      const valid = MAGIC[file.type].some((sig) =>
        sig.every((byte, i) => header[i] === byte)
      );
      if (!valid) {
        return NextResponse.json({ error: "文件内容与声明的格式不匹配" }, { status: 400 });
      }
    } else if (ZIP_TYPES.has(file.type)) {
      const valid = ZIP_MAGIC.every((byte, i) => header[i] === byte);
      if (!valid) {
        return NextResponse.json({ error: "文件内容与声明的格式不匹配" }, { status: 400 });
      }
    }
    const uuid = crypto.randomUUID();
    const ext = getExtFromMime(file.type);
    const filename = `${uuid}${ext}`;
    const base64 = buffer.toString("base64");

    // Store in Turso database to survive ephemeral filesystem restarts
    const db = await getDb();
    const result = await db.execute({
      sql: `INSERT INTO uploaded_images (filename, original_name, mime_type, data, file_size)
            VALUES (?, ?, ?, ?, ?)`,
      args: [filename, file.name, file.type, base64, file.size],
    });

    const imageId = result.lastInsertRowid!;
    const filePath = `/api/images/${imageId}`;

    return NextResponse.json({
      filename,
      originalName: file.name,
      filePath,
      fileSize: file.size,
      fileType: file.type,
    });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json({ error: "文件上传失败" }, { status: 500 });
  }
}
