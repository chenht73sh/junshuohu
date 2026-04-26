"use client";

import { useState, useRef, useCallback, DragEvent } from "react";
import {
  Upload,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  FileSpreadsheet,
  CreditCard,
  BookOpen,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImportError {
  row: number;
  message: string;
}

interface ImportResult {
  success: number;
  errors: ImportError[];
  message: string;
}

type TabKey = "cards" | "courses" | "enrollments";

interface TabConfig {
  key: TabKey;
  label: string;
  icon: React.ElementType;
  templateFile: string;
  templateName: string;
  apiEndpoint: string;
  description: string;
  previewColumns: string[];
}

const TABS: TabConfig[] = [
  {
    key: "cards",
    label: "次卡购买记录",
    icon: CreditCard,
    templateFile: "/templates/次卡购买记录导入模板.xlsx",
    templateName: "次卡购买记录导入模板.xlsx",
    apiEndpoint: "/api/admin/import/cards",
    description: "批量导入会员次卡购买记录（10次卡/20次卡/单次）",
    previewColumns: ["会员用户名", "会员姓名", "次卡类型", "实付金额", "购买日期", "备注"],
  },
  {
    key: "courses",
    label: "课程批量导入",
    icon: BookOpen,
    templateFile: "/templates/课程批量导入模板.xlsx",
    templateName: "课程批量导入模板.xlsx",
    apiEndpoint: "/api/admin/import/courses",
    description: "批量创建课程，包含课程名称、讲师、日期、地点等信息",
    previewColumns: ["课程名称", "主讲老师", "课程日期", "开始时间", "上课地点", "人数上限", "板块分类", "课程简介"],
  },
  {
    key: "enrollments",
    label: "手动报名",
    icon: Users,
    templateFile: "/templates/手动报名批量导入模板.xlsx",
    templateName: "手动报名批量导入模板.xlsx",
    apiEndpoint: "/api/admin/import/enrollments",
    description: "批量导入手动报名记录（适用于未注册用户或线下报名）",
    previewColumns: ["课程名称", "参与者姓名", "手机号", "支付方式", "带人数", "备注"],
  },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("cards");
  const activeConfig = TABS.find((t) => t.key === activeTab)!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <Upload size={20} className="text-amber-700" />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-semibold text-text-primary">批量导入</h1>
          <p className="text-sm text-text-muted">通过 Excel 模板批量导入次卡、课程和报名数据</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-border-light/50 rounded-xl w-fit flex-wrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === key
                ? "bg-white text-amber-800 shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <ImportTab key={activeTab} config={activeConfig} />
    </div>
  );
}

// ─── Import Tab ────────────────────────────────────────────────────────────────

function ImportTab({ config }: { config: TabConfig }) {
  const { token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [parseError, setParseError] = useState<string>("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Client-side preview parse using FileReader
  const parsePreview = useCallback((f: File) => {
    setParseError("");
    setPreviewRows([]);

    if (!f.name.endsWith(".xlsx") && !f.name.endsWith(".xls")) {
      setParseError("只支持 .xlsx 或 .xls 格式的文件");
      return;
    }

    // We do a simple binary parse to show row count; actual parsing is server-side
    // Just show file info + the columns
    setPreviewRows([]);
    setFile(f);
    setResult(null);
  }, []);

  const handleFileSelect = (f: File) => {
    parsePreview(f);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  };

  const handleUpload = async () => {
    if (!file || !token) return;
    setUploading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(config.apiEndpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data: ImportResult = await res.json();
      setResult(data);
    } catch {
      setResult({ success: 0, errors: [{ row: 0, message: "网络错误或服务器异常，请重试" }], message: "导入失败" });
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreviewRows([]);
    setResult(null);
    setParseError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Description */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <config.icon size={18} className="text-amber-700 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800">{config.description}</p>
      </div>

      {/* Step 1: Download template */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs flex items-center justify-center font-bold">1</span>
          下载填写模板
        </h3>
        <p className="text-xs text-text-muted">下载 Excel 模板，按照模板格式填写数据后上传。第1行为表头，第2行为示例（不会被导入），从第3行起填写真实数据。</p>
        <a
          href={config.templateFile}
          download={config.templateName}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          <Download size={15} />
          下载 {config.templateName}
        </a>
        {/* Column list */}
        <div className="flex flex-wrap gap-2 pt-1">
          {config.previewColumns.map((col) => (
            <span key={col} className="px-2 py-0.5 text-xs bg-border-light rounded text-text-muted">
              {col}
            </span>
          ))}
        </div>
      </div>

      {/* Step 2: Upload */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs flex items-center justify-center font-bold">2</span>
          上传 Excel 文件
        </h3>

        {!file ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              dragging
                ? "border-amber-400 bg-amber-50"
                : "border-border hover:border-amber-300 hover:bg-amber-50/30"
            }`}
          >
            <FileSpreadsheet size={32} className="mx-auto text-amber-400 mb-3" />
            <p className="text-sm text-text-secondary">拖拽 Excel 文件至此，或点击选择文件</p>
            <p className="text-xs text-text-muted mt-1">支持 .xlsx 格式</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleInputChange}
            />
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <FileSpreadsheet size={20} className="text-amber-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
              <p className="text-xs text-text-muted">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              onClick={reset}
              className="text-xs text-text-muted hover:text-error transition-colors px-2 py-1 rounded hover:bg-red-50"
            >
              重新选择
            </button>
          </div>
        )}

        {parseError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <XCircle size={15} />
            {parseError}
          </div>
        )}
      </div>

      {/* Step 3: Import */}
      {file && !parseError && (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs flex items-center justify-center font-bold">3</span>
            确认导入
          </h3>
          <p className="text-xs text-text-muted">
            文件已准备好，点击「开始导入」后系统将在服务端解析并逐行校验数据。导入操作不可撤销，请确保数据已正确填写。
          </p>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {uploading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                导入中，请稍候…
              </>
            ) : (
              <>
                <Upload size={15} />
                开始导入
              </>
            )}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">导入结果</h3>

          <div className="flex gap-4 flex-wrap">
            {result.success > 0 && (
              <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle2 size={18} className="text-green-600" />
                <div>
                  <p className="text-lg font-bold text-green-700">{result.success}</p>
                  <p className="text-xs text-green-600">成功导入</p>
                </div>
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                <XCircle size={18} className="text-red-600" />
                <div>
                  <p className="text-lg font-bold text-red-700">{result.errors.length}</p>
                  <p className="text-xs text-red-600">失败行数</p>
                </div>
              </div>
            )}
            {result.success === 0 && result.errors.length === 0 && (
              <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle size={18} className="text-amber-600" />
                <p className="text-sm text-amber-700">文件中没有找到可导入的数据行（请检查是否从第3行开始填写数据）</p>
              </div>
            )}
          </div>

          {result.errors.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-red-700 uppercase tracking-wide">失败明细</p>
              <div className="max-h-64 overflow-y-auto space-y-1.5 rounded-lg bg-red-50 p-3 border border-red-100">
                {result.errors.map((err, i) => (
                  <div key={i} className="flex gap-2 text-xs text-red-700">
                    <span className="shrink-0 font-medium">第 {err.row} 行：</span>
                    <span>{err.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.success > 0 && result.errors.length === 0 && (
            <p className="text-sm text-green-700 flex items-center gap-2">
              <CheckCircle2 size={15} />
              全部数据导入成功！
            </p>
          )}

          <button
            onClick={reset}
            className="text-sm text-text-muted hover:text-text-secondary underline"
          >
            重新导入
          </button>
        </div>
      )}
    </div>
  );
}
