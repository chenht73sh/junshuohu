"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Users,
  CheckCircle2,
  CreditCard,
  DollarSign,
  QrCode,
  Plus,
  Download,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Copy,
  Check,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import QRCode from "qrcode";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CourseInfo {
  id: number;
  title: string;
  start_time: string | null;
  location: string | null;
  status: string;
  max_participants: number | null;
  current_participants: number;
}

interface Enrollment {
  id: number;
  is_manual: number;
  guest_name: string | null;
  guest_phone: string | null;
  payment_type: string | null;
  single_price: number | null;
  guest_count: number;
  checked_in: number;
  checked_in_at: string | null;
  check_in_method: string | null;
  created_at: string;
  user_id: number | null;
  display_name: string | null;
  username: string | null;
  phone: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
}

function getName(e: Enrollment) {
  return e.is_manual ? e.guest_name || "—" : e.display_name || "—";
}

function getPhone(e: Enrollment) {
  return e.is_manual ? e.guest_phone || "—" : e.phone || "—";
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CourseEnrollmentsPage() {
  const { id } = useParams<{ id: string }>();
  const courseId = parseInt(id, 10);
  const router = useRouter();
  const { token } = useAuth();

  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // QR code state
  const [qrExpanded, setQrExpanded] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Add enrollment modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    guestName: "",
    guestPhone: "",
    paymentType: "次卡",
    guestCount: 0,
  });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Check-in loading
  const [checkingIn, setCheckingIn] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/enrollments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "加载失败");
        return;
      }
      const data = await res.json();
      setCourse(data.course as CourseInfo);
      setEnrollments(data.enrollments as Enrollment[]);
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }, [token, courseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Generate QR code when expanded
  useEffect(() => {
    if (!qrExpanded) return;
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${baseUrl}/courses/${courseId}/checkin`;
    setQrUrl(url);
    QRCode.toDataURL(url, { width: 240, margin: 2, color: { dark: "#4A3728", light: "#FFFEF9" } })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [qrExpanded, courseId]);

  function handleCopyUrl() {
    navigator.clipboard.writeText(qrUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Stats
  const totalCheckedIn = enrollments.filter((e) => e.checked_in).length;
  const totalCard = enrollments.filter((e) => e.payment_type === "次卡").length;
  const totalSingle = enrollments.filter((e) => e.payment_type === "单次").length;
  const checkinRate = enrollments.length > 0 ? Math.round((totalCheckedIn / enrollments.length) * 100) : 0;

  async function handleCheckIn(enrollmentId: number, checkedIn: boolean) {
    if (!token) return;
    setCheckingIn(enrollmentId);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/checkin`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enrollmentId, checkedIn }),
      });
      if (res.ok) {
        setEnrollments((prev) =>
          prev.map((e) =>
            e.id === enrollmentId
              ? {
                  ...e,
                  checked_in: checkedIn ? 1 : 0,
                  checked_in_at: checkedIn ? new Date().toISOString() : null,
                  check_in_method: checkedIn ? "manual" : null,
                }
              : e
          )
        );
      } else {
        const data = await res.json();
        alert(data.error || "操作失败");
      }
    } catch {
      alert("网络错误");
    } finally {
      setCheckingIn(null);
    }
  }

  async function handleDeleteEnrollment(enrollmentId: number, name: string) {
    if (!confirm(`确定要删除「${name}」的报名记录吗？`)) return;
    if (!token) return;
    try {
      const res = await fetch(
        `/api/admin/courses/${courseId}/enrollments?enrollmentId=${enrollmentId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        setEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId));
        if (course) setCourse({ ...course, current_participants: course.current_participants - 1 });
      } else {
        const data = await res.json();
        alert(data.error || "删除失败");
      }
    } catch {
      alert("网络错误");
    }
  }

  async function handleAddEnrollment(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/enrollments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(addForm),
      });
      if (res.ok) {
        setShowAddModal(false);
        setAddForm({ guestName: "", guestPhone: "", paymentType: "次卡", guestCount: 0 });
        fetchData();
      } else {
        const data = await res.json();
        setAddError(data.error || "添加失败");
      }
    } catch {
      setAddError("网络错误");
    } finally {
      setAdding(false);
    }
  }

  function handleExport() {
    window.location.href = `/api/admin/courses/${courseId}/export`;
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-amber-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 text-red-500">
        <p>{error}</p>
        <button onClick={fetchData} className="mt-4 text-sm text-amber-700 underline">
          重试
        </button>
      </div>
    );
  }

  if (!course) return null;

  const statusLabel: Record<string, string> = { open: "报名中", closed: "已关闭", completed: "已结束" };
  const statusStyle: Record<string, string> = {
    open: "bg-green-50 text-green-700",
    closed: "bg-amber-50 text-amber-700",
    completed: "bg-gray-100 text-gray-500",
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Back + Header */}
      <div>
        <button
          onClick={() => router.push("/admin/courses")}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-amber-700 mb-3 transition-colors"
        >
          <ArrowLeft size={15} />
          返回课程管理
        </button>
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-2xl font-semibold text-text-primary leading-tight">
              {course.title}
            </h1>
            <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-text-muted">
              <span>📅 {formatDate(course.start_time)}</span>
              {course.location && <span>📍 {course.location}</span>}
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[course.status] || ""}`}
              >
                {statusLabel[course.status] || course.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            icon: Users,
            label: "总报名人数",
            value: enrollments.length,
            sub: course.max_participants ? `上限 ${course.max_participants}` : "不限人数",
            color: "bg-amber-100 text-amber-700",
          },
          {
            icon: CheckCircle2,
            label: "已签到",
            value: totalCheckedIn,
            sub: `签到率 ${checkinRate}%`,
            progress: checkinRate,
            color: "bg-green-100 text-green-700",
          },
          {
            icon: CreditCard,
            label: "次卡报名",
            value: totalCard,
            sub: `占 ${enrollments.length > 0 ? Math.round((totalCard / enrollments.length) * 100) : 0}%`,
            color: "bg-blue-100 text-blue-700",
          },
          {
            icon: DollarSign,
            label: "单次购买",
            value: totalSingle,
            sub: `占 ${enrollments.length > 0 ? Math.round((totalSingle / enrollments.length) * 100) : 0}%`,
            color: "bg-purple-100 text-purple-700",
          },
        ].map(({ icon: Icon, label, value, sub, progress, color }) => (
          <div
            key={label}
            className="bg-surface border border-border rounded-xl p-4 shadow-card"
          >
            <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-2`}>
              <Icon size={18} />
            </div>
            <p className="text-2xl font-bold text-text-primary">{value}</p>
            <p className="text-xs text-text-muted mt-0.5">{label}</p>
            {progress !== undefined && (
              <div className="mt-2 h-1.5 bg-border-light rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
            <p className="text-xs text-text-muted mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* QR code collapsible section */}
      <div className="bg-surface border border-border rounded-xl shadow-card overflow-hidden">
        <button
          onClick={() => setQrExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-amber-50/40 transition-colors"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
            <QrCode size={17} className="text-amber-600" />
            课程签到二维码
          </div>
          {qrExpanded ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
        </button>

        {qrExpanded && (
          <div className="px-5 pb-5 flex flex-col sm:flex-row items-center gap-6 border-t border-border-light">
            <div className="shrink-0 p-3 bg-[#FFFEF9] border border-amber-100 rounded-xl shadow-sm">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="签到二维码" className="w-40 h-40" />
              ) : (
                <div className="w-40 h-40 flex items-center justify-center">
                  <Loader2 size={20} className="animate-spin text-amber-400" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-3 text-center sm:text-left">
              <p className="text-sm font-medium text-text-primary">学员扫描此二维码完成签到</p>
              <p className="text-xs text-text-muted">
                学员登录后扫码，系统自动记录签到时间。未登录用户将跳转至登录页。
              </p>
              <div className="flex items-center gap-2 max-w-md">
                <input
                  readOnly
                  value={qrUrl}
                  className="flex-1 px-3 py-1.5 text-xs border border-border rounded-lg bg-bg text-text-muted truncate"
                />
                <button
                  onClick={handleCopyUrl}
                  className="shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "已复制" : "复制"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action row */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          <Plus size={15} />
          手动添加报名
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-amber-300 text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
        >
          <Download size={15} />
          导出名单 Excel
        </button>
      </div>

      {/* Enrollment table */}
      <div className="bg-surface border border-border rounded-xl shadow-card overflow-hidden">
        {enrollments.length === 0 ? (
          <div className="text-center py-16 text-text-muted text-sm">
            暂无报名记录，点击「手动添加报名」开始记录
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-amber-50/60 border-b border-border-light text-xs text-text-muted uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">序号</th>
                  <th className="px-4 py-3 text-left">姓名</th>
                  <th className="px-4 py-3 text-left">手机</th>
                  <th className="px-4 py-3 text-center">来源</th>
                  <th className="px-4 py-3 text-center">支付方式</th>
                  <th className="px-4 py-3 text-center">带人数</th>
                  <th className="px-4 py-3 text-left">报名时间</th>
                  <th className="px-4 py-3 text-center">签到状态</th>
                  <th className="px-4 py-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {enrollments.map((e, index) => (
                  <tr key={e.id} className="hover:bg-amber-50/20 transition-colors">
                    <td className="px-4 py-3 text-text-muted text-xs">{index + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-primary">{getName(e)}</p>
                      {!e.is_manual && e.username && (
                        <p className="text-xs text-text-muted">@{e.username}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-muted text-sm">{getPhone(e)}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          e.is_manual
                            ? "bg-orange-100 text-orange-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {e.is_manual ? "手动" : "系统"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-text-secondary">
                        {e.payment_type || "次卡"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-text-secondary text-sm">
                      {e.guest_count > 0 ? `+${e.guest_count}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {formatDate(e.created_at)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {e.checked_in ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
                            <CheckCircle2 size={13} />
                            已签到
                          </span>
                          <span className="text-xs text-text-muted">
                            {formatDate(e.checked_in_at)}
                          </span>
                          <span className="text-xs text-text-muted">
                            {e.check_in_method === "qrcode" ? "扫码" : "手动"}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleCheckIn(e.id, true)}
                          disabled={checkingIn === e.id}
                          className="px-3 py-1 text-xs border border-border rounded-lg text-text-muted hover:border-green-400 hover:text-green-700 hover:bg-green-50 transition-colors disabled:opacity-40"
                        >
                          {checkingIn === e.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            "标记签到"
                          )}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {e.checked_in ? (
                          <button
                            onClick={() => handleCheckIn(e.id, false)}
                            disabled={checkingIn === e.id}
                            className="text-xs text-text-muted hover:text-amber-700 hover:underline disabled:opacity-40"
                          >
                            取消签到
                          </button>
                        ) : null}
                        {e.is_manual ? (
                          <button
                            onClick={() => handleDeleteEnrollment(e.id, getName(e))}
                            className="text-xs text-red-400 hover:text-red-600 hover:underline"
                          >
                            删除
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Enrollment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-primary">手动添加报名</h3>
              <button
                onClick={() => { setShowAddModal(false); setAddError(null); }}
                className="p-1 rounded-lg hover:bg-border-light"
              >
                <X size={16} />
              </button>
            </div>

            {addError && (
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{addError}</p>
            )}

            <form onSubmit={handleAddEnrollment} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={addForm.guestName}
                  onChange={(e) => setAddForm((f) => ({ ...f, guestName: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:border-amber-400 bg-surface"
                  placeholder="参与者姓名"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">
                  手机（选填）
                </label>
                <input
                  value={addForm.guestPhone}
                  onChange={(e) => setAddForm((f) => ({ ...f, guestPhone: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:border-amber-400 bg-surface"
                  placeholder="手机号码"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">
                  支付方式
                </label>
                <select
                  value={addForm.paymentType}
                  onChange={(e) => setAddForm((f) => ({ ...f, paymentType: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:border-amber-400 bg-surface"
                >
                  <option value="次卡">次卡</option>
                  <option value="单次">单次 ¥58</option>
                  <option value="免费">免费</option>
                  <option value="赠送">赠送</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">
                  带人数（0-5）
                </label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={addForm.guestCount}
                  onChange={(e) =>
                    setAddForm((f) => ({
                      ...f,
                      guestCount: Math.max(0, Math.min(5, parseInt(e.target.value, 10) || 0)),
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:border-amber-400 bg-surface"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setAddError(null); }}
                  className="flex-1 py-2 text-sm border border-border rounded-lg hover:bg-border-light transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="flex-1 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
                >
                  {adding ? "添加中..." : "确认添加"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
