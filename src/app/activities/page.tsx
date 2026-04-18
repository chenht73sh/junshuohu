"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Calendar, MapPin, Users, Clock, ChevronRight, Filter } from "lucide-react";

interface Activity {
  id: number;
  title: string;
  description: string | null;
  category_name: string | null;
  category_color: string | null;
  speaker: string | null;
  location: string | null;
  activity_date: string;
  start_time: string | null;
  end_time: string | null;
  max_participants: number | null;
  cover_image: string | null;
  status: string;
  participant_count: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
}

function statusLabel(status: string): { text: string; cls: string } {
  switch (status) {
    case "upcoming": return { text: "即将开始", cls: "bg-green-100 text-green-700" };
    case "ongoing": return { text: "进行中", cls: "bg-blue-100 text-blue-700" };
    case "completed": return { text: "已结束", cls: "bg-gray-100 text-gray-600" };
    case "cancelled": return { text: "已取消", cls: "bg-red-100 text-red-600" };
    default: return { text: status, cls: "bg-gray-100 text-gray-600" };
  }
}

function ActivityCard({ activity }: { activity: Activity }) {
  const { text: statusText, cls: statusCls } = statusLabel(activity.status);
  return (
    <Link
      href={`/activities/${activity.id}`}
      className="block bg-surface border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-card transition-all group"
    >
      {activity.cover_image ? (
        <div className="h-44 overflow-hidden bg-bg">
          <img
            src={activity.cover_image}
            alt={activity.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div
          className="h-44 flex items-center justify-center text-5xl"
          style={{ background: `linear-gradient(135deg, ${activity.category_color || "#8B6F47"}22, ${activity.category_color || "#8B6F47"}44)` }}
        >
          🎪
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCls}`}>{statusText}</span>
          {activity.category_name && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: `${activity.category_color || "#8B6F47"}22`, color: activity.category_color || "#8B6F47" }}
            >
              {activity.category_name}
            </span>
          )}
        </div>
        <h3 className="font-semibold text-text-primary mb-2 line-clamp-2 group-hover:text-primary transition-colors leading-snug">
          {activity.title}
        </h3>
        <div className="space-y-1.5 text-xs text-text-muted">
          <div className="flex items-center gap-1.5">
            <Calendar size={12} className="shrink-0 text-primary/60" />
            <span>{formatDate(activity.activity_date)}</span>
            {activity.start_time && <span className="text-text-muted/60">· {activity.start_time}</span>}
          </div>
          {activity.location && (
            <div className="flex items-center gap-1.5">
              <MapPin size={12} className="shrink-0 text-primary/60" />
              <span className="line-clamp-1">{activity.location}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Users size={12} className="shrink-0 text-primary/60" />
            <span>
              {activity.participant_count} 人已报名
              {activity.max_participants ? ` / 限 ${activity.max_participants} 人` : ""}
            </span>
          </div>
        </div>
        {activity.speaker && (
          <div className="mt-2 pt-2 border-t border-border-light text-xs text-text-muted">
            主讲：{activity.speaker}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"upcoming" | "completed">("upcoming");
  const [page, setPage] = useState(1);

  const fetchActivities = useCallback(async (tab: string, p: number) => {
    setLoading(true);
    try {
      const statusFilter = tab === "upcoming" ? "upcoming" : "completed";
      const res = await fetch(`/api/activities?status=${statusFilter}&page=${p}&limit=9`);
      const data = await res.json();
      setActivities(data.activities || []);
      setPagination(data.pagination || null);
    } catch {
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities(activeTab, page);
  }, [activeTab, page, fetchActivities]);

  function handleTabChange(tab: "upcoming" | "completed") {
    setActiveTab(tab);
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <div className="gradient-warm py-14 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-text-inverse mb-3">
            🎪 活动档案
          </h1>
          <p className="text-text-inverse/75 text-base sm:text-lg max-w-xl mx-auto">
            每一次相聚，都是灵魂的成长。记录我们共同走过的每一段旅程。
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Tabs */}
        <div className="flex items-center gap-3 mb-7">
          <button
            onClick={() => handleTabChange("upcoming")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === "upcoming"
                ? "bg-primary text-text-inverse"
                : "bg-surface border border-border text-text-secondary hover:border-primary/50"
            }`}
          >
            即将开始
          </button>
          <button
            onClick={() => handleTabChange("completed")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === "completed"
                ? "bg-primary text-text-inverse"
                : "bg-surface border border-border text-text-secondary hover:border-primary/50"
            }`}
          >
            往期回顾
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-surface border border-border rounded-xl overflow-hidden animate-pulse">
                <div className="h-44 bg-border-light" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-border-light rounded w-1/3" />
                  <div className="h-4 bg-border-light rounded w-full" />
                  <div className="h-3 bg-border-light rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-20 text-text-muted">
            <div className="text-5xl mb-4">🎪</div>
            <p className="text-lg font-medium text-text-secondary mb-1">
              {activeTab === "upcoming" ? "暂无即将开始的活动" : "暂无往期活动"}
            </p>
            <p className="text-sm">敬请期待新活动上线</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {activities.map((a) => (
              <ActivityCard key={a.id} activity={a} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm rounded-lg border border-border disabled:opacity-40 hover:border-primary/50 transition-colors"
            >
              上一页
            </button>
            <span className="text-sm text-text-muted px-3">
              {page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="px-4 py-2 text-sm rounded-lg border border-border disabled:opacity-40 hover:border-primary/50 transition-colors"
            >
              下一页
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
