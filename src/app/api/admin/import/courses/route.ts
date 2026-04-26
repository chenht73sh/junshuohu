import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

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

  // Resolve category name to id helper
  const categoryCache: Record<string, number | null> = {};
  async function getCategoryId(name: string): Promise<number | null> {
    if (name in categoryCache) return categoryCache[name];
    const result = await db.execute({
      sql: "SELECT id FROM categories WHERE name = ?",
      args: [name],
    });
    const id = result.rows.length > 0 ? (result.rows[0].id as number) : null;
    categoryCache[name] = id;
    return id;
  }

  // Default category for unmatched
  const defaultCategoryResult = await db.execute({
    sql: "SELECT id FROM categories ORDER BY sort_order ASC LIMIT 1",
    args: [],
  });
  const defaultCategoryId = defaultCategoryResult.rows.length > 0
    ? (defaultCategoryResult.rows[0].id as number)
    : 1;

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

    const getCellNumber = (col: number): number | null => {
      const cell = row.getCell(col);
      const v = cell.value;
      if (v === null || v === undefined || v === "") return null;
      const n = parseInt(String(v), 10);
      return isNaN(n) ? null : n;
    };

    const title = getCellText(1);
    const instructor = getCellText(2);
    const courseDate = getCellText(3);
    const startTime = getCellText(4);
    const location = getCellText(5);
    const maxCapacity = getCellNumber(6);
    const categoryName = getCellText(7);
    const description = getCellText(8);

    // Skip empty rows
    if (!title && !instructor && !courseDate) continue;

    const rowErrors: string[] = [];

    if (!title) rowErrors.push("课程名称不能为空");
    if (!instructor) rowErrors.push("主讲老师不能为空");
    if (!courseDate) rowErrors.push("课程日期不能为空");
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(courseDate)) rowErrors.push(`课程日期格式错误（填写了"${courseDate}"，需要 YYYY-MM-DD 格式）`);
    if (maxCapacity === null) rowErrors.push("人数上限不能为空");
    else if (maxCapacity <= 0) rowErrors.push("人数上限必须大于0");

    if (rowErrors.length > 0) {
      errors.push({ row: rowNum, message: rowErrors.join("；") });
      continue;
    }

    // Resolve category
    let categoryId = defaultCategoryId;
    if (categoryName) {
      const resolved = await getCategoryId(categoryName);
      if (resolved !== null) categoryId = resolved;
    }

    // Build start_time string: combine date + time if time given
    let startTimeValue: string | null = null;
    if (courseDate) {
      startTimeValue = startTime ? `${courseDate}T${startTime}:00` : `${courseDate}T00:00:00`;
    }

    try {
      await db.execute({
        sql: `INSERT INTO courses (title, description, category_id, instructor, start_time, location, max_participants)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          title,
          description || null,
          categoryId,
          instructor,
          startTimeValue,
          location || null,
          maxCapacity!,
        ],
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
