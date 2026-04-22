"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Calendar, MessageSquare, FileText, Star, Pencil, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Profile {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  role: string;
  created_at: string;
  total_points: number | null;
  profile_avatar: string | null;
  profile_bio: string | null;
  interests: string | null;
  expertise: string | null;
}

interface Stats {
  posts: number;
  comments: number;
  activities: number;
  totalPoints: number;
  radar: { activity: number; contribution: number; participation: number; influence: number; growth: number };
}

interface PointRecord {
  id: number;
  points: number;
  action: string;
  description: string | null;
  created_at: string;
}

// ─── Radar Chart ──────────────────────────────────────────────────────────────

const RADAR_LABELS = ["活跃度", "贡献度", "参与度", "影响力", "成长值"];
const RADAR_KEYS = ["activity", "contribution", "participation", "influence", "growth"] as const;

function polarToXY(angle: number, r: number, cx: number, cy: number) {
  const rad = (angle - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function RadarChart({ radar }: { radar: Stats["radar"] }) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 80;
  const n = 5;
  const angles = Array.from({ length: n }, (_, i) => (i * 360) / n);

  // Background rings
  const rings = [0.2, 0.4, 0.6, 0.8, 1.0];
  const ringPaths = rings.map((ratio) =>
    angles.map((a, i) => {
      const { x, y } = polarToXY(a, maxR * ratio, cx, cy);
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(" ") + " Z"
  );

  // Axis lines
  const axisLines = angles.map((a) => {
    const { x, y } = polarToXY(a, maxR, cx, cy);
    return { x, y };
  });

  // Data polygon
  const dataPoints = RADAR_KEYS.map((key, i) => {
    const val = Math.max(0, Math.min(100, radar[key] || 0));
    return polarToXY(angles[i], (val / 100) * maxR, cx, cy);
  });
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ") + " Z";

  // Label positions (slightly outside)
  const labelPositions = angles.map((a) => polarToXY(a, maxR + 22, cx, cy));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
      {/* Background rings */}
      {ringPaths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#D4A96422" strokeWidth={1} />
      ))}
      {/* Axis lines */}
      {axisLines.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#D4A96433" strokeWidth={1} />
      ))}
      {/* Data area */}
      <path d={dataPath} fill="#C1874433" stroke="#C18744" strokeWidth={2} />
      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill="#C18744" stroke="white" strokeWidth={1.5} />
      ))}
      {/* Labels */}
      {RADAR_LABELS.map((label, i) => {
        const lp = labelPositions[i];
        return (
          <text
            key={i}
            x={lp.x}
            y={lp.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="11"
            fill="#6B5535"
            fontWeight="500"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Point action labels ───────────────────────────────────────────────────────
function actionLabel(action: string): string {
  const map: Record<string, string> = {
    daily_checkin: "每日签到",
    comment: "评论互动",
    activity_join: "报名活动",
    activity_signin: "活动签到",
    post_create: "发布帖子",
    activity_organize: "组织活动",
  };
  return map[action] || action;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pointRecords, setPointRecords] = useState<PointRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ display_name: "", bio: "", interests: "", expertise: "" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: "", next: "", confirm: "" });
  const [pwdSaving, setPwdSaving] = useState(false);

  const isSelf = user && user.id === parseInt(id, 10);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, statsRes, pointsRes] = await Promise.all([
          fetch(`/api/users/${id}/profile`),
          fetch(`/api/users/${id}/stats`),
          fetch(`/api/users/${id}/points?limit=10`),
        ]);
        if (profileRes.ok) {
          const d = await profileRes.json();
          setProfile(d.profile);
          setEditForm({
            display_name: d.profile.display_name || "",
            bio: d.profile.profile_bio || d.profile.bio || "",
            interests: d.profile.interests || "",
            expertise: d.profile.expertise || "",
          });
        }
        if (statsRes.ok) setStats(await statsRes.json());
        if (pointsRes.ok) {
          const d = await pointsRes.json();
          setPointRecords(d.records || []);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleSave() {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/users/${id}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        showToast("档案已更新", "success");
        setEditing(false);
        // Refresh profile
        const d = await (await fetch(`/api/users/${id}/profile`)).json();
        setProfile(d.profile);
      } else {
        const d = await res.json();
        showToast(d.error || "保存失败", "error");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!pwdForm.next || pwdForm.next.length < 8) {
      showToast("新密码至少需要8位", "error"); return;
    }
    if (pwdForm.next !== pwdForm.confirm) {
      showToast("两次输入的新密码不一致", "error"); return;
    }
    setPwdSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/users/${id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: pwdForm.current, new_password: pwdForm.next }),
      });
      const d = await res.json();
      if (res.ok) {
        showToast("密码修改成功", "success");
        setShowPwdModal(false);
        setPwdForm({ current: "", next: "", confirm: "" });
      } else {
        showToast(d.error || "修改失败", "error");
      }
    } finally {
      setPwdSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-text-muted">
        用户不存在
      </div>
    );
  }

  const displayBio = profile.profile_bio || profile.bio;
  const interests = profile.interests ? profile.interests.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const expertise = profile.expertise ? profile.expertise.split(",").map((s) => s.trim()).filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-bg">
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-5 py-3 rounded-xl shadow-float text-sm font-medium ${
          toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Profile header */}
      <div className="gradient-warm py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-surface/30 border-4 border-white/30 flex items-center justify-center text-3xl shrink-0">
              {profile.profile_avatar || profile.avatar_url ? (
                <img
                  src={profile.profile_avatar || profile.avatar_url!}
                  alt={profile.display_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="font-serif text-3xl text-text-inverse font-bold">
                  {profile.display_name.charAt(0)}
                </span>
              )}
            </div>
            <div className="text-center sm:text-left flex-1">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-text-inverse">
                {profile.display_name}
              </h1>
              <p className="text-text-inverse/70 text-sm mt-1">@{profile.username}</p>
              {displayBio && (
                <p className="text-text-inverse/80 text-sm mt-2 max-w-lg">{displayBio}</p>
              )}
            </div>
            {isSelf && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 text-text-inverse rounded-lg text-sm transition-colors"
                >
                  <Pencil size={14} /> 编辑档案
                </button>
                <button
                  onClick={() => setShowPwdModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 text-text-inverse rounded-lg text-sm transition-colors"
                >
                  🔒 修改密码
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="space-y-5">
            {/* Stats */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-4">成就数据</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: FileText, label: "发帖", value: stats?.posts ?? 0, color: "text-primary" },
                  { icon: MessageSquare, label: "评论", value: stats?.comments ?? 0, color: "text-blue-500" },
                  { icon: Calendar, label: "活动", value: stats?.activities ?? 0, color: "text-green-600" },
                  { icon: Star, label: "积分", value: stats?.totalPoints ?? profile.total_points ?? 0, color: "text-amber-500" },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="flex items-center gap-2.5 p-2.5 bg-bg rounded-lg">
                    <Icon size={16} className={`shrink-0 ${color}`} />
                    <div>
                      <div className="text-sm font-bold text-text-primary">{value}</div>
                      <div className="text-xs text-text-muted">{label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interests */}
            {interests.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-3">兴趣领域</h3>
                <div className="flex flex-wrap gap-1.5">
                  {interests.map((tag) => (
                    <span key={tag} className="px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Expertise */}
            {expertise.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-3">专业技能</h3>
                <div className="flex flex-wrap gap-1.5">
                  {expertise.map((tag) => (
                    <span key={tag} className="px-2.5 py-1 bg-secondary/10 text-secondary text-xs rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Points link */}
            <Link
              href={`/leaderboard`}
              className="card p-4 flex items-center justify-between hover:border-primary/40 transition-colors group"
            >
              <div>
                <div className="text-sm font-medium text-text-primary">积分排行榜</div>
                <div className="text-xs text-text-muted mt-0.5">查看社区积分排名</div>
              </div>
              <Star size={18} className="text-amber-500 group-hover:scale-110 transition-transform" />
            </Link>
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-5">
            {/* Radar chart */}
            {stats && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-4">成长雷达</h3>
                <div className="flex items-center justify-center py-2">
                  <RadarChart radar={stats.radar} />
                </div>
                <div className="grid grid-cols-5 gap-1 mt-2">
                  {RADAR_KEYS.map((key, i) => (
                    <div key={key} className="text-center">
                      <div className="text-xs font-medium text-primary">{stats.radar[key]}</div>
                      <div className="text-xs text-text-muted">{RADAR_LABELS[i]}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent points */}
            {pointRecords.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-4">近期积分记录</h3>
                <div className="space-y-2">
                  {pointRecords.map((r) => (
                    <div key={r.id} className="flex items-center justify-between py-2 border-b border-border-light last:border-0">
                      <div>
                        <div className="text-sm text-text-primary">{r.description || actionLabel(r.action)}</div>
                        <div className="text-xs text-text-muted">{formatDate(r.created_at)}</div>
                      </div>
                      <div className={`text-sm font-semibold ${r.points > 0 ? "text-green-600" : "text-red-500"}`}>
                        {r.points > 0 ? "+" : ""}{r.points}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl shadow-float w-full max-w-lg">
            <div className="p-5 border-b border-border">
              <h2 className="font-semibold text-text-primary">编辑个人档案</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">显示名称</label>
                <input
                  value={editForm.display_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, display_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">个人简介</label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
                  placeholder="介绍一下自己…"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">兴趣领域</label>
                <input
                  value={editForm.interests}
                  onChange={(e) => setEditForm((f) => ({ ...f, interests: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                  placeholder="用逗号分隔，如：AI应用, 健康养生, 户外运动"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">专业技能</label>
                <input
                  value={editForm.expertise}
                  onChange={(e) => setEditForm((f) => ({ ...f, expertise: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                  placeholder="用逗号分隔，如：产品设计, Python, 法律咨询"
                />
              </div>
            </div>
            <div className="p-5 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 text-sm text-text-secondary border border-border rounded-lg hover:border-primary/50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-primary text-text-inverse rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
              >
                {saving ? "保存中…" : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 修改密码弹窗 */}
      {showPwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowPwdModal(false)}>
          <div className="bg-surface rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-lg font-semibold text-text-primary mb-5">🔒 修改密码</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">当前密码</label>
                <input
                  type="password"
                  value={pwdForm.current}
                  onChange={(e) => setPwdForm((f) => ({ ...f, current: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="请输入当前密码"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">新密码</label>
                <input
                  type="password"
                  value={pwdForm.next}
                  onChange={(e) => setPwdForm((f) => ({ ...f, next: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="至少8位"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">确认新密码</label>
                <input
                  type="password"
                  value={pwdForm.confirm}
                  onChange={(e) => setPwdForm((f) => ({ ...f, confirm: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="再输入一次新密码"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => { setShowPwdModal(false); setPwdForm({ current: "", next: "", confirm: "" }); }}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
                取消
              </button>
              <button
                onClick={handleChangePassword}
                disabled={pwdSaving}
                className="px-5 py-2 text-sm bg-primary text-text-inverse rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
              >
                {pwdSaving ? "修改中…" : "确认修改"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
