"use client";

import { useEffect, useState } from "react";
import { Users, FileText, BookOpen, UserCheck, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Stats {
  userCount: number;
  postCount: number;
  courseCount: number;
  enrollmentCount: number;
}

interface CardStats {
  card_holders: number;
  remaining_sessions: number;
}

interface RecentUser {
  id: number;
  username: string;
  display_name: string;
  role: string;
  created_at: string;
}

interface RecentPost {
  id: number;
  title: string;
  created_at: string;
  view_count: number;
  author_name: string;
  category_name: string;
}

const statCards = [
  { key: "userCount" as const, label: "用户总数", icon: Users, color: "bg-[#8B6F47]" },
  { key: "postCount" as const, label: "帖子总数", icon: FileText, color: "bg-[#4A90D9]" },
  { key: "courseCount" as const, label: "课程数", icon: BookOpen, color: "bg-[#6B8F71]" },
  { key: "enrollmentCount" as const, label: "报名数", icon: UserCheck, color: "bg-[#D4A574]" },
];

export default function AdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [cardStats, setCardStats] = useState<CardStats | null>(null);
  const [monthlyEnrollments, setMonthlyEnrollments] = useState<number>(0);

  useEffect(() => {
    if (!token) return;
    fetch("/api/admin/stats", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setStats(data.stats);
        setRecentUsers(data.recentUsers || []);
        setRecentPosts(data.recentPosts || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Fetch card stats
    fetch("/api/admin/member-cards/stats", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.overall) setCardStats(data.overall);
        if (data.monthly) setMonthlyEnrollments(data.monthly.monthly_enrollments || 0);
      })
      .catch(() => {});
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="font-serif text-2xl font-semibold text-text-primary">仪表盘</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-border-light animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-2xl font-semibold text-text-primary">仪表盘</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className="bg-surface border border-border rounded-xl p-5 flex items-center gap-4 shadow-card"
            >
              <div
                className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center shrink-0`}
              >
                <Icon size={22} className="text-white" />
              </div>
              <div>
                <p className="text-sm text-text-muted">{card.label}</p>
                <p className="text-2xl font-semibold text-text-primary">
                  {stats?.[card.key] ?? 0}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Card stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-xl p-5 flex items-center gap-4 shadow-card">
          <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
            <Users size={22} className="text-amber-700" />
          </div>
          <div>
            <p className="text-sm text-text-muted">次卡持有人数</p>
            <p className="text-2xl font-semibold text-text-primary">{cardStats?.card_holders ?? 0}</p>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5 flex items-center gap-4 shadow-card">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
            <UserCheck size={22} className="text-blue-700" />
          </div>
          <div>
            <p className="text-sm text-text-muted">本月报名人次</p>
            <p className="text-2xl font-semibold text-text-primary">{monthlyEnrollments}</p>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5 flex items-center gap-4 shadow-card">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
            <CreditCard size={22} className="text-green-700" />
          </div>
          <div>
            <p className="text-sm text-text-muted">次卡总剩余次数</p>
            <p className="text-2xl font-semibold text-text-primary">{cardStats?.remaining_sessions ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Recent data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent users */}
        <div className="bg-surface border border-border rounded-xl shadow-card">
          <div className="px-5 py-4 border-b border-border-light">
            <h2 className="font-serif text-lg font-semibold text-text-primary">
              最近注册用户
            </h2>
          </div>
          <div className="divide-y divide-border-light">
            {recentUsers.length === 0 ? (
              <p className="px-5 py-8 text-center text-text-muted text-sm">暂无数据</p>
            ) : (
              recentUsers.map((u) => (
                <div key={u.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-medium text-primary">
                        {u.display_name.charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {u.display_name}
                      </p>
                      <p className="text-xs text-text-muted">@{u.username}</p>
                    </div>
                  </div>
                  <RoleBadge role={u.role} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent posts */}
        <div className="bg-surface border border-border rounded-xl shadow-card">
          <div className="px-5 py-4 border-b border-border-light">
            <h2 className="font-serif text-lg font-semibold text-text-primary">
              最近发布帖子
            </h2>
          </div>
          <div className="divide-y divide-border-light">
            {recentPosts.length === 0 ? (
              <p className="px-5 py-8 text-center text-text-muted text-sm">暂无数据</p>
            ) : (
              recentPosts.map((p) => (
                <div key={p.id} className="px-5 py-3">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {p.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                    <span>{p.author_name}</span>
                    <span>·</span>
                    <span>{p.category_name}</span>
                    <span>·</span>
                    <span>{p.view_count} 浏览</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    admin: "bg-[#8B6F47]/10 text-[#8B6F47]",
    moderator: "bg-[#4A90D9]/10 text-[#4A90D9]",
    member: "bg-[#6B8F71]/10 text-[#6B8F71]",
  };
  const labels: Record<string, string> = {
    admin: "管理员",
    moderator: "版主",
    member: "成员",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
        styles[role] || styles.member
      }`}
    >
      {labels[role] || role}
    </span>
  );
}
