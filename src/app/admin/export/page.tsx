"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Download, Users, BookOpen, FileText } from "lucide-react";

interface Course {
  id: number;
  title: string;
}

export default function AdminExportPage() {
  const { token } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [downloading, setDownloading] = useState<string | null>(null);

  const fetchCourses = useCallback(() => {
    if (!token) return;
    fetch("/api/admin/courses", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setCourses(data.courses || []))
      .catch(console.error);
  }, [token]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  async function handleDownload(type: "users" | "enrollments" | "posts") {
    if (!token) return;
    setDownloading(type);
    try {
      let url = `/api/admin/export/${type}`;
      if (type === "enrollments" && selectedCourseId) {
        url += `?courseId=${selectedCourseId}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "导出失败");
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const filenamMatch = disposition.match(/filename="?([^";\s]+)"?/);
      const filename = filenamMatch ? filenamMatch[1] : `${type}_export.csv`;

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      alert("网络错误，请稍后重试");
    } finally {
      setDownloading(null);
    }
  }

  const exportCards = [
    {
      key: "users" as const,
      icon: <Users size={28} className="text-primary" />,
      title: "用户列表",
      desc: "导出所有注册用户，包含 ID、用户名、昵称、邮箱、角色、积分、注册时间。",
      fields: ["ID", "用户名", "昵称", "邮箱", "角色", "积分", "注册时间"],
      extra: null,
    },
    {
      key: "enrollments" as const,
      icon: <BookOpen size={28} className="text-amber-600" />,
      title: "课程报名名单",
      desc: "导出课程报名记录，包含课程名、报名人信息和报名时间。可筛选特定课程。",
      fields: ["课程名称", "用户名", "昵称", "邮箱", "报名时间"],
      extra: (
        <div className="mt-3">
          <label className="block text-xs text-text-muted mb-1">筛选课程（留空导出全部）</label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
          >
            <option value="">全部课程</option>
            {courses.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      ),
    },
    {
      key: "posts" as const,
      icon: <FileText size={28} className="text-secondary" />,
      title: "帖子列表",
      desc: "导出全部帖子，包含 ID、标题、作者、板块、发布时间、浏览量和回复数。",
      fields: ["ID", "标题", "作者", "板块", "发布时间", "浏览量", "回复数"],
      extra: null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-bold text-text-primary">
          📤 数据导出
        </h1>
        <p className="text-sm text-text-muted mt-1">
          将社群数据导出为 CSV 文件（UTF-8 BOM 编码，Excel 可直接打开）
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {exportCards.map((card) => (
          <div
            key={card.key}
            className="card p-6 flex flex-col gap-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent-light/50 flex items-center justify-center shrink-0">
                {card.icon}
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">{card.title}</h3>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">{card.desc}</p>
              </div>
            </div>

            {/* Field tags */}
            <div className="flex flex-wrap gap-1.5">
              {card.fields.map((f) => (
                <span
                  key={f}
                  className="px-2 py-0.5 text-xs bg-accent-light/50 text-text-secondary rounded-md border border-border-light"
                >
                  {f}
                </span>
              ))}
            </div>

            {/* Extra controls */}
            {card.extra}

            {/* Download button */}
            <button
              onClick={() => handleDownload(card.key)}
              disabled={downloading === card.key}
              className="mt-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-text-inverse text-sm font-medium rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download size={15} />
              {downloading === card.key ? "导出中..." : `下载 CSV`}
            </button>
          </div>
        ))}
      </div>

      {/* Usage notes */}
      <div className="p-4 bg-accent-light/30 border border-border rounded-xl text-sm text-text-secondary space-y-1.5">
        <p className="font-medium text-text-primary">📌 使用说明</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>文件使用 UTF-8 BOM 编码，用 Excel 直接打开中文显示正常</li>
          <li>导出数据为实时快照，刷新后重新下载可获取最新数据</li>
          <li>课程报名导出支持选择特定课程，留空则导出所有课程的报名记录</li>
          <li>所有导出操作仅管理员可执行</li>
        </ul>
      </div>
    </div>
  );
}
