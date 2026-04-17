import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { JwtPayload } from "@/lib/auth";
import path from "path";
import fs from "fs";
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

    // Build date-based directory
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const relDir = path.join("uploads", year, month);
    const absDir = path.join(process.cwd(), "public", relDir);

    if (!fs.existsSync(absDir)) {
      fs.mkdirSync(absDir, { recursive: true });
    }

    // Generate unique filename
    const uuid = crypto.randomUUID();
    const ext = getExtFromMime(file.type);
    const filename = `${uuid}${ext}`;
    const absPath = path.join(absDir, filename);
    const filePath = `/${relDir.replace(/\\/g, "/")}/${filename}`;

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(absPath, buffer);

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
