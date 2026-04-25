"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  Plus,
  Search,
  BarChart3,
  ChevronDown,
  ChevronUp,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types ───────────────────────────────────────────────────────────────────

interface MemberCard {
  id: number;
  user_id: number;
  card_type: string;
  total_sessions: number;
  remaining_sessions: number;
  purchase_price: number;
  purchase_date: string;
  notes: string | null;
  created_by: number | null;
  created_at: string;
  display_name: string;
  username: string;
  phone: string | null;
  created_by_name: string | null;
}

interface CardTransaction {
  id: number;
  card_id: number;
  user_id: number;
  course_id: number | null;
  enrollment_id: number | null;
  sessions_deducted: number;
  guest_count: number;
  transaction_type: string;
  notes: string | null;
  created_at: string;
  course_title: string | null;
}

interface User {
  id: number;
  display_name: string;
  username: string;
}

interface CourseStatRow {
  course_id: number;
  course_title: string;
  start_time: string | null;
  total_enrollments: number;
  card_enrollments: number;
  single_enrollments: number;
  total_guests: number;
}

interface Stats {
  overall: {
    total_cards: number;
    total_sessions: number;
    used_sessions: number;
    remaining_sessions: number;
    card_holders: number;
  };
  byType: { card_type: string; count: number; total: number; remaining: number }[];
  monthly: { monthly_enrollments: number };
  courseStats: CourseStatRow[];
}

// ─── Default prices ───────────────────────────────────────────────────────────

const DEFAULT_PRICES: Record<string, number> = {
  "10次卡": 480,
  "20次卡": 880,
  "单次": 58,
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MemberCardsPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "add" | "stats">("overview");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <CreditCard size={20} className="text-amber-700" />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-semibold text-text-primary">次卡管理</h1>
          <p className="text-sm text-text-muted">会员次卡购买记录与消费流水</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-border-light/50 rounded-xl w-fit">
        {[
          { key: "overview", label: "次卡总览", icon: CreditCard },
          { key: "add", label: "录入新次卡", icon: Plus },
          { key: "stats", label: "课程报名统计", icon: BarChart3 },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
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
      {activeTab === "overview" && <OverviewTab token={token} />}
      {activeTab === "add" && <AddCardTab token={token} onSuccess={() => setActiveTab("overview")} />}
      {activeTab === "stats" && <StatsTab token={token} />}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ token }: { token: string | null }) {
  const [cards, setCards] = useState<MemberCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [drawerCard, setDrawerCard] = useState<MemberCard | null>(null);
  const [drawerTxs, setDrawerTxs] = useState<CardTransaction[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [adjustCard, setAdjustCard] = useState<MemberCard | null>(null);
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustNotes, setAdjustNotes] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const fetchCards = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const res = await fetch(`/api/admin/member-cards?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCards(data.cards || []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  async function openDrawer(card: MemberCard) {
    setDrawerCard(card);
    setDrawerLoading(true);
    try {
      const res = await fetch(`/api/admin/member-cards/${card.id}`, {
        headers: { Authorization: `Bearer ${token || ""}` },
      });
      const data = await res.json();
      setDrawerTxs(data.transactions || []);
    } finally {
      setDrawerLoading(false);
    }
  }

  async function handleAdjust() {
    if (!adjustCard || adjustAmount === 0 || !token) return;
    setAdjusting(true);
    try {
      const res = await fetch(`/api/admin/member-cards/${adjustCard.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ adjustment: adjustAmount, notes: adjustNotes }),
      });
      if (res.ok) {
        setAdjustCard(null);
        setAdjustAmount(0);
        setAdjustNotes("");
        fetchCards();
        alert("余额调整成功");
      } else {
        const data = await res.json();
        alert(data.error || "调整失败");
      }
    } finally {
      setAdjusting(false);
    }
  }

  const filtered = cards.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.display_name.toLowerCase().includes(s) ||
      c.username.toLowerCase().includes(s) ||
      (c.phone && c.phone.includes(s))
    );
  });

  function remainingColor(remaining: number, total: number) {
    if (remaining === 0) return "text-red-600 font-bold";
    if (remaining <= 3) return "text-orange-500 font-semibold";
    return "text-text-primary";
  }

  function formatDate(d: string) {
    try { return new Date(d).toLocaleDateString("zh-CN"); } catch { return d; }
  }

  function txTypeColor(t: string) {
    if (t === "课程报名") return "text-blue-600 bg-blue-50";
    if (t === "管理员调整") return "text-amber-700 bg-amber-50";
    if (t === "退款退次") return "text-green-600 bg-green-50";
    return "text-text-muted bg-border-light";
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索会员姓名 / 账号"
          className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:border-amber-400 bg-surface"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-amber-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-text-muted text-sm">
          {search ? "没有找到匹配的次卡" : "暂无次卡记录"}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light bg-amber-50/50 text-xs text-text-muted uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">会员</th>
                  <th className="px-4 py-3 text-left">联系方式</th>
                  <th className="px-4 py-3 text-left">次卡类型</th>
                  <th className="px-4 py-3 text-left">购买日期</th>
                  <th className="px-4 py-3 text-center">总次数</th>
                  <th className="px-4 py-3 text-center">已用</th>
                  <th className="px-4 py-3 text-center">剩余</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {filtered.map((card) => {
                  const used = card.total_sessions - card.remaining_sessions;
                  return (
                    <tr key={card.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-text-primary">{card.display_name}</p>
                      </td>
                      <td className="px-4 py-3 text-text-muted text-xs">
                        @{card.username}
                        {card.phone && <><br />{card.phone}</>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 font-medium">
                          {card.card_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-muted text-xs">
                        {formatDate(card.purchase_date)}
                      </td>
                      <td className="px-4 py-3 text-center text-text-secondary">
                        {card.total_sessions}
                      </td>
                      <td className="px-4 py-3 text-center text-text-secondary">
                        {used}
                      </td>
                      <td className={`px-4 py-3 text-center ${remainingColor(card.remaining_sessions, card.total_sessions)}`}>
                        {card.remaining_sessions}
                        {card.remaining_sessions === 0 && (
                          <span className="ml-1 text-xs">（已用完）</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openDrawer(card)}
                            className="text-xs text-amber-700 hover:text-amber-900 hover:underline"
                          >
                            查看详情
                          </button>
                          <button
                            onClick={() => {
                              setAdjustCard(card);
                              setAdjustAmount(0);
                              setAdjustNotes("");
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            调整余额
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {drawerCard && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setDrawerCard(null)} />
          <div className="w-full max-w-md bg-surface shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-amber-50">
              <div>
                <p className="font-medium text-text-primary">{drawerCard.display_name} 的次卡</p>
                <p className="text-xs text-text-muted mt-0.5">{drawerCard.card_type} · 剩余 {drawerCard.remaining_sessions} 次</p>
              </div>
              <button onClick={() => setDrawerCard(null)} className="p-1 rounded-lg hover:bg-amber-100">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {drawerLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 size={20} className="animate-spin text-amber-600" />
                </div>
              ) : drawerTxs.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-10">暂无消费记录</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-text-muted font-medium uppercase tracking-wide">消费流水</p>
                  {drawerTxs.map((tx) => (
                    <div key={tx.id} className="flex items-start gap-3 p-3 rounded-lg bg-bg border border-border-light">
                      <span className={`px-2 py-0.5 text-xs rounded-full shrink-0 ${txTypeColor(tx.transaction_type)}`}>
                        {tx.transaction_type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary">
                          {tx.course_title || tx.notes || "—"}
                        </p>
                        {tx.guest_count > 0 && (
                          <p className="text-xs text-text-muted">带人 {tx.guest_count} 位</p>
                        )}
                        <p className="text-xs text-text-muted mt-0.5">
                          {new Date(tx.created_at).toLocaleString("zh-CN")}
                        </p>
                      </div>
                      <span className={`shrink-0 text-sm font-semibold ${tx.sessions_deducted > 0 ? "text-red-500" : "text-green-500"}`}>
                        {tx.sessions_deducted > 0 ? "-" : "+"}{Math.abs(tx.sessions_deducted)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {adjustCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-primary">调整余额</h3>
              <button onClick={() => setAdjustCard(null)} className="p-1 rounded-lg hover:bg-border-light">
                <X size={16} />
              </button>
            </div>
            <div className="text-sm text-text-muted bg-amber-50 rounded-lg px-3 py-2">
              {adjustCard.display_name} · {adjustCard.card_type} · 当前剩余 <strong>{adjustCard.remaining_sessions}</strong> 次
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">
                调整量（负数扣减，正数增加）
              </label>
              <input
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:border-amber-400"
                placeholder="例如 -2 或 +3"
              />
              {adjustAmount !== 0 && (
                <p className={`text-xs mt-1 ${adjustCard.remaining_sessions + adjustAmount < 0 ? "text-red-500" : "text-amber-700"}`}>
                  调整后余额：{adjustCard.remaining_sessions + adjustAmount} 次
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">备注</label>
              <input
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:border-amber-400"
                placeholder="调整原因（选填）"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setAdjustCard(null)}
                className="flex-1 py-2 text-sm border border-border rounded-lg hover:bg-border-light transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAdjust}
                disabled={adjusting || adjustAmount === 0 || adjustCard.remaining_sessions + adjustAmount < 0}
                className="flex-1 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {adjusting ? "处理中..." : "确认调整"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add Card Tab ─────────────────────────────────────────────────────────────

function AddCardTab({ token, onSuccess }: { token: string | null; onSuccess: () => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [form, setForm] = useState({
    userId: "",
    cardType: "10次卡",
    purchasePrice: DEFAULT_PRICES["10次卡"],
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setUsers(data.users || []))
      .catch(() => {})
      .finally(() => setUsersLoading(false));
  }, [token]);

  function handleCardTypeChange(cardType: string) {
    setForm((f) => ({ ...f, cardType, purchasePrice: DEFAULT_PRICES[cardType] ?? 58 }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.userId) { alert("请选择会员"); return; }
    if (!token) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/member-cards", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: parseInt(form.userId, 10),
          cardType: form.cardType,
          purchasePrice: form.purchasePrice,
          notes: form.notes || undefined,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setForm({ userId: "", cardType: "10次卡", purchasePrice: DEFAULT_PRICES["10次卡"], notes: "" });
        setTimeout(() => { setSuccess(false); onSuccess(); }, 1500);
      } else {
        const data = await res.json();
        alert(data.error || "录入失败");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg">
      <div className="bg-surface border border-border rounded-xl shadow-card p-6 space-y-5">
        <h2 className="font-semibold text-text-primary flex items-center gap-2">
          <Plus size={18} className="text-amber-600" />
          录入新次卡
        </h2>

        {success && (
          <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            <CheckCircle2 size={16} />
            次卡录入成功！即将返回总览…
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Member select */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              选择会员 <span className="text-error">*</span>
            </label>
            {usersLoading ? (
              <div className="text-xs text-text-muted">加载用户列表...</div>
            ) : (
              <div className="relative">
                <select
                  value={form.userId}
                  onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
                  required
                  className="w-full appearance-none px-3 py-2.5 pr-8 text-sm border border-border rounded-lg bg-surface focus:outline-none focus:border-amber-400"
                >
                  <option value="">— 请选择会员 —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.display_name}（@{u.username}）
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
            )}
          </div>

          {/* Card type */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              次卡类型 <span className="text-error">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["10次卡", "20次卡", "单次"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleCardTypeChange(type)}
                  className={`py-2.5 text-sm rounded-lg border text-center transition-colors ${
                    form.cardType === type
                      ? "bg-amber-50 border-amber-400 text-amber-800 font-medium"
                      : "border-border text-text-muted hover:border-amber-200"
                  }`}
                >
                  <div className="font-medium">{type}</div>
                  <div className="text-xs mt-0.5 opacity-70">¥{DEFAULT_PRICES[type]}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Purchase price */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              实付金额（元）
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">¥</span>
              <input
                type="number"
                value={form.purchasePrice}
                onChange={(e) => setForm((f) => ({ ...f, purchasePrice: parseFloat(e.target.value) || 0 }))}
                min={0}
                step={1}
                className="w-full pl-7 pr-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              备注（选填）
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:border-amber-400 resize-none"
              placeholder="如：会员日折扣购买、转赠等"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !form.userId}
            className="w-full py-2.5 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {submitting ? "录入中..." : "录入次卡"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Stats Tab ────────────────────────────────────────────────────────────────

function StatsTab({ token }: { token: string | null }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
  const [courseEnrollments, setCourseEnrollments] = useState<Record<number, unknown[]>>({});
  const [loadingCourse, setLoadingCourse] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch("/api/admin/member-cards/stats", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  async function toggleCourse(courseId: number) {
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
      return;
    }
    setExpandedCourse(courseId);
    if (courseEnrollments[courseId]) return;
    setLoadingCourse(courseId);
    try {
      const res = await fetch(`/api/courses/${courseId}/enrollments`, {
        headers: { Authorization: `Bearer ${token || ""}` },
      });
      const data = await res.json();
      setCourseEnrollments((prev) => ({ ...prev, [courseId]: data.enrollments || [] }));
    } finally {
      setLoadingCourse(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={24} className="animate-spin text-amber-600" />
      </div>
    );
  }

  if (!stats) return null;

  const { overall, byType, monthly, courseStats } = stats;

  function formatDate(d: string | null) {
    if (!d) return "待定";
    try { return new Date(d).toLocaleDateString("zh-CN"); } catch { return d; }
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "次卡持有人数", value: overall.card_holders, icon: Users, color: "bg-amber-100 text-amber-700" },
          { label: "本月报名人次", value: monthly?.monthly_enrollments ?? 0, icon: BarChart3, color: "bg-blue-100 text-blue-700" },
          { label: "次卡总剩余次数", value: overall.remaining_sessions, icon: CreditCard, color: "bg-green-100 text-green-700" },
          { label: "次卡已用次数", value: overall.used_sessions, icon: CheckCircle2, color: "bg-orange-100 text-orange-700" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-4 shadow-card">
            <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-2`}>
              <Icon size={18} />
            </div>
            <p className="text-2xl font-bold text-text-primary">{value}</p>
            <p className="text-xs text-text-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* By type */}
      {byType.length > 0 && (
        <div className="bg-surface border border-border rounded-xl shadow-card p-5">
          <h3 className="font-semibold text-text-primary mb-4">各类型次卡分布</h3>
          <div className="grid grid-cols-3 gap-4">
            {byType.map((t) => (
              <div key={t.card_type} className="text-center p-4 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-lg font-bold text-amber-800">{t.count}</p>
                <p className="text-sm font-medium text-amber-700 mt-0.5">{t.card_type}</p>
                <p className="text-xs text-text-muted mt-1">剩余 {t.remaining} / {t.total} 次</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Course stats */}
      <div className="bg-surface border border-border rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border-light">
          <h3 className="font-semibold text-text-primary">课程报名统计</h3>
        </div>
        {courseStats.length === 0 ? (
          <p className="text-center py-10 text-text-muted text-sm">暂无课程数据</p>
        ) : (
          <div className="divide-y divide-border-light">
            {courseStats.map((row) => (
              <div key={row.course_id}>
                <div
                  className="flex items-center gap-4 px-5 py-3 hover:bg-amber-50/40 cursor-pointer transition-colors"
                  onClick={() => toggleCourse(row.course_id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{row.course_title}</p>
                    <p className="text-xs text-text-muted">{formatDate(row.start_time)}</p>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-center shrink-0">
                    <div>
                      <p className="font-semibold text-text-primary">{row.total_enrollments}</p>
                      <p className="text-xs text-text-muted">报名</p>
                    </div>
                    <div>
                      <p className="font-semibold text-amber-700">{row.card_enrollments}</p>
                      <p className="text-xs text-text-muted">次卡</p>
                    </div>
                    <div>
                      <p className="font-semibold text-blue-600">{row.single_enrollments}</p>
                      <p className="text-xs text-text-muted">单次</p>
                    </div>
                    <div>
                      <p className="font-semibold text-green-600">{row.total_guests}</p>
                      <p className="text-xs text-text-muted">带人</p>
                    </div>
                  </div>
                  <button className="text-text-muted ml-2">
                    {expandedCourse === row.course_id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {/* Expanded enrollment list */}
                {expandedCourse === row.course_id && (
                  <div className="px-5 pb-4 bg-amber-50/20">
                    {loadingCourse === row.course_id ? (
                      <div className="flex justify-center py-4">
                        <Loader2 size={16} className="animate-spin text-amber-600" />
                      </div>
                    ) : (courseEnrollments[row.course_id] || []).length === 0 ? (
                      <p className="text-xs text-text-muted py-3">暂无报名记录</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pt-2">
                        {(courseEnrollments[row.course_id] as Array<{
                          id: number;
                          display_name: string;
                          created_at: string;
                          payment_type?: string;
                          guest_count?: number;
                        }>).map((e) => (
                          <div key={e.id} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-amber-100 text-xs">
                            <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                              <span className="text-amber-700 text-xs font-medium">{e.display_name.charAt(0)}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-text-primary truncate">{e.display_name}</p>
                              <p className="text-text-muted">{e.payment_type || "次卡"}{(e.guest_count ?? 0) > 0 ? ` +${e.guest_count}人` : ""}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
