import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const CARD_SESSIONS: Record<string, number> = {
  "10次卡": 10,
  "20次卡": 20,
  "单次": 1,
};

const VALID_CARD_TYPES = new Set(Object.keys(CARD_SESSIONS));

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

  const errors: { row: number; message: string }[] = [];
  let successCount = 0;

  // Collect all rows (skip row 1 header, row 2 sample → start at row 3)
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
      const n = parseFloat(String(v));
      return isNaN(n) ? null : n;
    };

    const username = getCellText(1);
    const cardType = getCellText(3);
    const purchasePriceRaw = getCellNumber(4);
    const purchaseDate = getCellText(5);
    const notes = getCellText(6);

    // Skip completely empty rows
    if (!username && !cardType && purchasePriceRaw === null && !purchaseDate) continue;

    const rowErrors: string[] = [];

    if (!username) rowErrors.push("会员用户名不能为空");
    if (!cardType) rowErrors.push("次卡类型不能为空");
    else if (!VALID_CARD_TYPES.has(cardType)) rowErrors.push(`次卡类型无效（填写了"${cardType}"，只接受：10次卡/20次卡/单次）`);
    if (purchasePriceRaw === null) rowErrors.push("实付金额不能为空");
    else if (purchasePriceRaw <= 0) rowErrors.push("实付金额必须大于0");
    if (!purchaseDate) rowErrors.push("购买日期不能为空");
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) rowErrors.push(`购买日期格式错误（填写了"${purchaseDate}"，需要 YYYY-MM-DD 格式）`);

    if (rowErrors.length > 0) {
      errors.push({ row: rowNum, message: rowErrors.join("；") });
      continue;
    }

    // Check user exists
    const userResult = await db.execute({
      sql: "SELECT id FROM users WHERE username = ?",
      args: [username],
    });

    if (userResult.rows.length === 0) {
      errors.push({ row: rowNum, message: `用户名"${username}"在系统中不存在` });
      continue;
    }

    const userId = userResult.rows[0].id as number;
    const totalSessions = CARD_SESSIONS[cardType];

    try {
      await db.execute({
        sql: `INSERT INTO member_cards (user_id, card_type, total_sessions, remaining_sessions, purchase_price, purchase_date, notes, created_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [userId, cardType, totalSessions, totalSessions, purchasePriceRaw!, purchaseDate, notes || null, auth.userId],
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
