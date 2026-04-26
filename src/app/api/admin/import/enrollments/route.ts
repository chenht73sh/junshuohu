import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const VALID_PAYMENT_TYPES = new Set(["次卡", "单次", "免费", "赠送"]);

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "无法解析上传数据" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "请上传 xlsx 文件" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (workbook.xlsx as any).load(Buffer.from(arrayBuffer));

  const ws = workbook.worksheets[0];
  if (!ws) {
    return NextResponse.json({ error: "Excel 文件中没有找到工作表" }, { status: 400 });
  }

  const db = await initializeDatabase();

  // Course title → id cache
  const courseCache: Record<string, number | null> = {};
  async function getCourseId(title: string): Promise<number | null> {
    if (title in courseCache) return courseCache[title];
    const result = await db.execute({
      sql: "SELECT id FROM courses WHERE title = ?",
      args: [title],
    });
    const id = result.rows.length > 0 ? (result.rows[0].id as number) : null;
    courseCache[title] = id;
    return id;
  }

  const errors: { row: number; message: string }[] = [];
  let successCount = 0;

  const rowsToProcess: ExcelJS.Row[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber >= 3) rowsToProcess.push(row);
  });

  for (const row of rowsToProcess) {
    const rowNum = row.number;

    const getCellText = (col: number): string => {
      const cell = row.getCell(col);
      const v = cell.value;
      if (v === null || v === undefined) return "";
      if (typeof v === "object" && "richText" in v) {
        return (v as ExcelJS.CellRichTextValue).richText.map((r) => r.text).join("").trim();
      }
      return String(v).trim();
    };

    const getCellNumber = (col: number): number => {
      const cell = row.getCell(col);
      const v = cell.value;
      if (v === null || v === undefined || v === "") return 0;
      const n = parseInt(String(v), 10);
      return isNaN(n) ? 0 : n;
    };

    const courseTitle = getCellText(1);
    const guestName = getCellText(2);
    const guestPhone = getCellText(3);
    const paymentType = getCellText(4);
    const guestCount = getCellNumber(5);
    const notes = getCellText(6);

    // Skip empty rows
    if (!courseTitle && !guestName && !paymentType) continue;

    const rowErrors: string[] = [];

    if (!courseTitle) rowErrors.push("课程名称不能为空");
    if (!guestName) rowErrors.push("参与者姓名不能为空");
    if (!paymentType) rowErrors.push("支付方式不能为空");
    else if (!VALID_PAYMENT_TYPES.has(paymentType)) rowErrors.push(`支付方式无效（填写了"${paymentType}"，只接受：次卡/单次/免费/赠送）`);

    if (rowErrors.length > 0) {
      errors.push({ row: rowNum, message: rowErrors.join("；") });
      continue;
    }

    // Resolve course
    const courseId = await getCourseId(courseTitle);
    if (courseId === null) {
      errors.push({ row: rowNum, message: `课程"${courseTitle}"在系统中不存在，请先创建课程或检查名称是否完全一致` });
      continue;
    }

    try {
      await db.execute({
        sql: `INSERT INTO enrollments (course_id, user_id, is_manual, guest_name, guest_phone, payment_type, guest_count)
              VALUES (?, 0, 1, ?, ?, ?, ?)`,
        args: [courseId, guestName, guestPhone || null, paymentType, guestCount],
      });

      // Update course current_participants
      await db.execute({
        sql: "UPDATE courses SET current_participants = current_participants + 1 WHERE id = ?",
        args: [courseId],
      });

      successCount++;
    } catch (e) {
      errors.push({ row: rowNum, message: `数据库写入失败：${e instanceof Error ? e.message : String(e)}` });
    }
  }

  return NextResponse.json({
    success: successCount,
    errors,
    message: `导入完成：成功 ${successCount} 条，失败 ${errors.length} 条`,
  });
}
