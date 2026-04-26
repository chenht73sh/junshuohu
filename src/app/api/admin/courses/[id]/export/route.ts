import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

// GET /api/admin/courses/[id]/export — download enrollment list as Excel
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const courseId = parseInt(id, 10);
  if (isNaN(courseId)) {
    return NextResponse.json({ error: "无效的课程ID" }, { status: 400 });
  }

  const db = await initializeDatabase();

  const courseResult = await db.execute({
    sql: "SELECT id, title, start_time, location, instructor FROM courses WHERE id = ?",
    args: [courseId],
  });
  if (courseResult.rows.length === 0) {
    return NextResponse.json({ error: "课程不存在" }, { status: 404 });
  }
  const course = courseResult.rows[0] as unknown as {
    id: number;
    title: string;
    start_time: string | null;
    location: string | null;
    instructor: string;
  };

  const result = await db.execute({
    sql: `SELECT
            e.id, e.is_manual, e.guest_name, e.guest_phone,
            e.payment_type, e.guest_count,
            e.checked_in, e.checked_in_at, e.check_in_method,
            e.created_at,
            u.display_name, u.username, u.phone
          FROM enrollments e
          LEFT JOIN users u ON e.user_id = u.id AND e.is_manual = 0
          WHERE e.course_id = ?
          ORDER BY e.created_at ASC`,
    args: [courseId],
  });

  const rows = result.rows as unknown as Array<{
    id: number;
    is_manual: number;
    guest_name: string | null;
    guest_phone: string | null;
    payment_type: string | null;
    guest_count: number;
    checked_in: number;
    checked_in_at: string | null;
    check_in_method: string | null;
    created_at: string;
    display_name: string | null;
    username: string | null;
    phone: string | null;
  }>;

  // Build workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "君说乎";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("报名名单");

  // Course info header rows
  const courseDate = course.start_time
    ? new Date(course.start_time).toLocaleString("zh-CN")
    : "待定";

  sheet.mergeCells("A1:J1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = `课程：${course.title}`;
  titleCell.font = { bold: true, size: 13 };
  titleCell.alignment = { horizontal: "left" };

  sheet.mergeCells("A2:J2");
  const infoCell = sheet.getCell("A2");
  infoCell.value = `讲师：${course.instructor}  |  时间：${courseDate}  |  地点：${course.location || "未指定"}`;
  infoCell.font = { size: 10, color: { argb: "FF666666" } };

  sheet.addRow([]); // spacer

  // Table header (row 4)
  const headerRow = sheet.addRow([
    "序号", "姓名", "手机", "来源", "支付方式", "带人数", "报名时间", "签到状态", "签到时间", "签到方式",
  ]);
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFCECD8" },
    };
    cell.font = { bold: true, size: 11 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
  headerRow.height = 22;

  // Data rows
  let totalCheckedIn = 0;
  let totalCard = 0;
  let totalSingle = 0;

  rows.forEach((row, index) => {
    const name = row.is_manual ? (row.guest_name || "—") : (row.display_name || "—");
    const phone = row.is_manual ? (row.guest_phone || "—") : (row.phone || "—");
    const source = row.is_manual ? "手动" : "系统";
    const payment = row.payment_type || "次卡";
    const checkedIn = row.checked_in ? "已签到" : "未签到";
    const checkedInAt = row.checked_in_at
      ? new Date(row.checked_in_at).toLocaleString("zh-CN")
      : "—";
    const method =
      row.check_in_method === "manual"
        ? "手动"
        : row.check_in_method === "qrcode"
        ? "二维码"
        : "—";
    const enrolledAt = new Date(row.created_at).toLocaleString("zh-CN");

    if (row.checked_in) totalCheckedIn++;
    if (payment === "次卡") totalCard++;
    if (payment === "单次") totalSingle++;

    const dataRow = sheet.addRow([
      index + 1,
      name,
      phone,
      source,
      payment,
      row.guest_count ?? 0,
      enrolledAt,
      checkedIn,
      checkedInAt,
      method,
    ]);

    dataRow.eachCell((cell) => {
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFDDDDDD" } },
        left: { style: "thin", color: { argb: "FFDDDDDD" } },
        bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
        right: { style: "thin", color: { argb: "FFDDDDDD" } },
      };
    });

    // Colour "已签到" green
    if (row.checked_in) {
      dataRow.getCell(8).font = { color: { argb: "FF16A34A" }, bold: true };
    }
    // Color source labels
    if (row.is_manual) {
      dataRow.getCell(4).font = { color: { argb: "FFD97706" } };
    } else {
      dataRow.getCell(4).font = { color: { argb: "FF2563EB" } };
    }
  });

  // Stats summary row
  sheet.addRow([]); // spacer
  const statsRow = sheet.addRow([
    "统计",
    `总人数：${rows.length}`,
    "",
    "",
    `次卡：${totalCard} / 单次：${totalSingle}`,
    "",
    "",
    `已签到：${totalCheckedIn} / 签到率：${rows.length > 0 ? Math.round((totalCheckedIn / rows.length) * 100) : 0}%`,
    "",
    "",
  ]);
  statsRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFF8F0" },
    };
  });

  // Column widths
  sheet.columns = [
    { key: "seq", width: 6 },
    { key: "name", width: 14 },
    { key: "phone", width: 16 },
    { key: "source", width: 8 },
    { key: "payment", width: 10 },
    { key: "guests", width: 8 },
    { key: "enrolledAt", width: 20 },
    { key: "checkedIn", width: 10 },
    { key: "checkedInAt", width: 20 },
    { key: "method", width: 10 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();

  const date = new Date().toISOString().slice(0, 10);
  const filename = encodeURIComponent(`报名名单_${course.title}_${date}.xlsx`);

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
    },
  });
}
