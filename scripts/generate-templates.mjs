import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../public/templates");

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// ─── Shared style helpers ─────────────────────────────────────────────────────

function headerStyle(fill = "FCECD8") {
  return {
    font: { bold: true, size: 11, color: { argb: "FF4A2C0A" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: `FF${fill}` } },
    alignment: { horizontal: "center", vertical: "middle", wrapText: true },
    border: {
      top: { style: "thin", color: { argb: "FFCCAD86" } },
      left: { style: "thin", color: { argb: "FFCCAD86" } },
      bottom: { style: "thin", color: { argb: "FFCCAD86" } },
      right: { style: "thin", color: { argb: "FFCCAD86" } },
    },
  };
}

function sampleStyle() {
  return {
    font: { color: { argb: "FF999999" }, italic: true, size: 10 },
    alignment: { vertical: "middle" },
  };
}

function noteSheetStyle() {
  return {
    font: { size: 10, color: { argb: "FF555555" } },
    alignment: { wrapText: true, vertical: "top" },
  };
}

function addNoteSheet(workbook, notes) {
  const ws = workbook.addWorksheet("填写说明");
  ws.getColumn(1).width = 80;
  ws.getRow(1).height = 30;
  const titleCell = ws.getCell("A1");
  titleCell.value = "填写规范说明";
  titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4A2C0A" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  notes.forEach((note, i) => {
    const row = ws.getRow(i + 2);
    row.height = 24;
    const cell = row.getCell(1);
    cell.value = note;
    Object.assign(cell, noteSheetStyle());
    if (note.startsWith("⚠") || note.startsWith("❌")) {
      cell.font = { ...noteSheetStyle().font, color: { argb: "FFCC0000" } };
    } else if (note.startsWith("✅")) {
      cell.font = { ...noteSheetStyle().font, color: { argb: "FF006600" } };
    }
  });
}

// ─── Template 1: 次卡购买记录导入模板 ─────────────────────────────────────────

async function makeCardTemplate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "君说乎数字家园";
  wb.created = new Date();

  const ws = wb.addWorksheet("次卡购买记录");

  // Column widths
  ws.columns = [
    { key: "username", width: 20 },
    { key: "display_name", width: 16 },
    { key: "card_type", width: 14 },
    { key: "price", width: 14 },
    { key: "date", width: 16 },
    { key: "notes", width: 30 },
  ];

  // Row 1 — Headers
  const headers = ["会员用户名", "会员姓名", "次卡类型", "实付金额", "购买日期", "备注"];
  const required = [true, false, true, true, true, false];
  const hRow = ws.getRow(1);
  hRow.height = 28;
  headers.forEach((h, i) => {
    const cell = hRow.getCell(i + 1);
    cell.value = required[i] ? `${h} *` : h;
    Object.assign(cell, headerStyle());
  });

  // Row 2 — Sample data
  const sRow = ws.getRow(2);
  sRow.height = 22;
  const samples = ["zhangsan", "张三", "10次卡", 480, "2026-04-26", "会员日折扣"];
  samples.forEach((v, i) => {
    const cell = sRow.getCell(i + 1);
    cell.value = v;
    Object.assign(cell, sampleStyle());
  });

  // Rows 3–20 — empty
  for (let r = 3; r <= 20; r++) {
    const row = ws.getRow(r);
    row.height = 20;
    for (let c = 1; c <= 6; c++) {
      const cell = row.getCell(c);
      cell.border = {
        top: { style: "hair", color: { argb: "FFDDDDDD" } },
        left: { style: "hair", color: { argb: "FFDDDDDD" } },
        bottom: { style: "hair", color: { argb: "FFDDDDDD" } },
        right: { style: "hair", color: { argb: "FFDDDDDD" } },
      };
    }
  }

  // Data validation for card_type column (C)
  ws.dataValidations.add("C3:C200", {
    type: "list",
    allowBlank: false,
    formulae: ['"10次卡,20次卡,单次"'],
    showErrorMessage: true,
    errorTitle: "无效的次卡类型",
    error: "请从下拉列表中选择：10次卡、20次卡 或 单次",
  });

  addNoteSheet(wb, [
    "【次卡购买记录导入模板 — 填写规范】",
    "",
    "✅ A列（会员用户名）：必填。填写已在系统注册的用户名（username），不是显示名称。",
    "   B列（会员姓名）：选填。仅供人工核对参考，系统以用户名为准。",
    "✅ C列（次卡类型）：必填。只能填以下三个值之一（已提供下拉选择）：",
    "   → 10次卡（对应10次/480元）",
    "   → 20次卡（对应20次/880元）",
    "   → 单次（对应1次/58元）",
    "✅ D列（实付金额）：必填。填写实际支付的金额（纯数字，不含¥符号）。",
    "✅ E列（购买日期）：必填。格式为 YYYY-MM-DD，例如：2026-04-26。",
    "   F列（备注）：选填。可填写折扣原因、赠送说明等。",
    "",
    "⚠ 注意：第1行为表头（不导入），第2行为示例（不导入），从第3行起为真实数据。",
    "⚠ 注意：用户名必须是系统中已注册的用户，填写不存在的用户名会导致该行导入失败。",
    "❌ 请勿修改表头行（第1行）或删除示例行（第2行）的行号，否则系统将跳过错误行。",
  ]);

  const outPath = path.join(outDir, "次卡购买记录导入模板.xlsx");
  await wb.xlsx.writeFile(outPath);
  console.log("✅ 生成：次卡购买记录导入模板.xlsx");
}

// ─── Template 2: 课程批量导入模板 ─────────────────────────────────────────────

async function makeCourseTemplate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "君说乎数字家园";
  wb.created = new Date();

  const ws = wb.addWorksheet("课程信息");

  ws.columns = [
    { key: "title", width: 30 },
    { key: "instructor", width: 16 },
    { key: "date", width: 14 },
    { key: "time", width: 12 },
    { key: "location", width: 18 },
    { key: "max_capacity", width: 12 },
    { key: "category", width: 16 },
    { key: "description", width: 40 },
  ];

  const headers = ["课程名称", "主讲老师", "课程日期", "开始时间", "上课地点", "人数上限", "板块分类", "课程简介"];
  const required = [true, true, true, false, false, true, false, false];
  const hRow = ws.getRow(1);
  hRow.height = 28;
  headers.forEach((h, i) => {
    const cell = hRow.getCell(i + 1);
    cell.value = required[i] ? `${h} *` : h;
    Object.assign(cell, headerStyle());
  });

  const sRow = ws.getRow(2);
  sRow.height = 22;
  const samples = ["AI工具实战工作坊", "陈工", "2026-05-10", "14:00", "线下·上海", 30, "AI应用交流", "手把手教你用AI工具开启副业"];
  samples.forEach((v, i) => {
    const cell = sRow.getCell(i + 1);
    cell.value = v;
    Object.assign(cell, sampleStyle());
  });

  for (let r = 3; r <= 20; r++) {
    const row = ws.getRow(r);
    row.height = 20;
    for (let c = 1; c <= 8; c++) {
      const cell = row.getCell(c);
      cell.border = {
        top: { style: "hair", color: { argb: "FFDDDDDD" } },
        left: { style: "hair", color: { argb: "FFDDDDDD" } },
        bottom: { style: "hair", color: { argb: "FFDDDDDD" } },
        right: { style: "hair", color: { argb: "FFDDDDDD" } },
      };
    }
  }

  // Validation for category column (G)
  ws.dataValidations.add("G3:G200", {
    type: "list",
    allowBlank: true,
    formulae: ['"AI应用交流,艺术人文,健康养生,微普法,乐走徒友,跑团,HR社群,国王与天使,微习惯"'],
    showErrorMessage: false,
  });

  addNoteSheet(wb, [
    "【课程批量导入模板 — 填写规范】",
    "",
    "✅ A列（课程名称）：必填。课程的标题，建议简洁明了。",
    "✅ B列（主讲老师）：必填。主讲老师姓名。",
    "✅ C列（课程日期）：必填。格式为 YYYY-MM-DD，例如：2026-05-10。",
    "   D列（开始时间）：选填。格式为 HH:MM，例如：14:00。",
    "   E列（上课地点）：选填。如：线下·上海、线上腾讯会议 等。",
    "✅ F列（人数上限）：必填。填写正整数，如 30。",
    "   G列（板块分类）：选填。建议从下拉列表选择（可留空）：",
    "   → AI应用交流 / 艺术人文 / 健康养生 / 微普法 / 乐走徒友 / 跑团 / HR社群 / 国王与天使 / 微习惯",
    "   H列（课程简介）：选填。课程详细描述。",
    "",
    "⚠ 注意：第1行为表头，第2行为示例，从第3行起为真实数据。",
    "⚠ 注意：课程名称在系统中可以重复，但建议保持唯一以便后续报名导入能正确匹配。",
  ]);

  const outPath = path.join(outDir, "课程批量导入模板.xlsx");
  await wb.xlsx.writeFile(outPath);
  console.log("✅ 生成：课程批量导入模板.xlsx");
}

// ─── Template 3: 手动报名批量导入模板 ─────────────────────────────────────────

async function makeEnrollmentTemplate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "君说乎数字家园";
  wb.created = new Date();

  const ws = wb.addWorksheet("手动报名");

  ws.columns = [
    { key: "course_title", width: 30 },
    { key: "guest_name", width: 16 },
    { key: "phone", width: 16 },
    { key: "payment_type", width: 14 },
    { key: "guest_count", width: 12 },
    { key: "notes", width: 30 },
  ];

  const headers = ["课程名称", "参与者姓名", "手机号", "支付方式", "带人数", "备注"];
  const required = [true, true, false, true, false, false];
  const hRow = ws.getRow(1);
  hRow.height = 28;
  headers.forEach((h, i) => {
    const cell = hRow.getCell(i + 1);
    cell.value = required[i] ? `${h} *` : h;
    Object.assign(cell, headerStyle());
  });

  const sRow = ws.getRow(2);
  sRow.height = 22;
  const samples = ["AI工具实战工作坊", "李四", "13800138000", "次卡", 1, "带了一位朋友"];
  samples.forEach((v, i) => {
    const cell = sRow.getCell(i + 1);
    cell.value = v;
    Object.assign(cell, sampleStyle());
  });

  for (let r = 3; r <= 20; r++) {
    const row = ws.getRow(r);
    row.height = 20;
    for (let c = 1; c <= 6; c++) {
      const cell = row.getCell(c);
      cell.border = {
        top: { style: "hair", color: { argb: "FFDDDDDD" } },
        left: { style: "hair", color: { argb: "FFDDDDDD" } },
        bottom: { style: "hair", color: { argb: "FFDDDDDD" } },
        right: { style: "hair", color: { argb: "FFDDDDDD" } },
      };
    }
  }

  // Validation for payment_type column (D)
  ws.dataValidations.add("D3:D200", {
    type: "list",
    allowBlank: false,
    formulae: ['"次卡,单次,免费,赠送"'],
    showErrorMessage: true,
    errorTitle: "无效的支付方式",
    error: "请从下拉列表中选择：次卡、单次、免费 或 赠送",
  });

  addNoteSheet(wb, [
    "【手动报名批量导入模板 — 填写规范】",
    "",
    "✅ A列（课程名称）：必填。必须与系统中已存在的课程名称完全一致（包括标点符号）。",
    "✅ B列（参与者姓名）：必填。参与者的姓名。",
    "   C列（手机号）：选填。参与者手机号，用于后续联系。",
    "✅ D列（支付方式）：必填。只能填以下四个值之一（已提供下拉选择）：",
    "   → 次卡（用次卡抵扣）",
    "   → 单次（单次购买，58元）",
    "   → 免费（免费参加）",
    "   → 赠送（赠送名额）",
    "   E列（带人数）：选填。若该参与者带了额外的人，填写带来的人数（纯数字，默认0）。",
    "   F列（备注）：选填。其他备注信息。",
    "",
    "⚠ 注意：第1行为表头，第2行为示例，从第3行起为真实数据。",
    "⚠ 注意：课程名称若在系统中找不到匹配，该行将导入失败并在错误报告中列出。",
    "⚠ 注意：此模板用于手动添加不在系统注册的参与者，或为已注册用户补录报名记录。",
    "❌ 支付方式填写错误（如填写了中文以外的值）会导致该行导入失败。",
  ]);

  const outPath = path.join(outDir, "手动报名批量导入模板.xlsx");
  await wb.xlsx.writeFile(outPath);
  console.log("✅ 生成：手动报名批量导入模板.xlsx");
}

// ─── Run all ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("📋 开始生成导入模板...\n");
  await makeCardTemplate();
  await makeCourseTemplate();
  await makeEnrollmentTemplate();
  console.log("\n🎉 全部模板生成完成！保存在 public/templates/ 目录下。");
}

main().catch((err) => {
  console.error("❌ 生成失败:", err);
  process.exit(1);
});
