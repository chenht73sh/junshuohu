"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Calendar, MapPin, Users, Clock, ArrowLeft, CheckCircle, XCircle, Camera, Share2, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

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
  summary: string | null;
  status: string;
  participant_count: number;
  signed_in_count: number;
}

interface Participant {
  user_id: number;
  display_name: string;
  username: string;
  avatar_url: string | null;
  signed_in: number;
}

interface Photo {
  id: number;
  image_url: string;
  caption: string | null;
  uploader_name: string | null;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
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

export default function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [participating, setParticipating] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [isParticipant, setIsParticipant] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [copied, setCopied] = useState(false);

  function handleCopyLink() {
    const url = `${window.location.origin}/activities/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/activities/${id}`);
        if (!res.ok) return;
        const data = await res.json();
        setActivity(data.activity);
        setParticipants(data.participants || []);
        setPhotos(data.photos || []);

        if (user) {
          const mine = (data.participants || []).find((p: Participant) => p.user_id === user.id);
          setIsParticipant(!!mine);
          setIsSignedIn(!!(mine?.signed_in));
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, user]);

  async function handleParticipate() {
    if (!user) { showToast("请先登录", "error"); return; }
    setParticipating(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/activities/${id}/participate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "报名成功", "success");
        setIsParticipant(true);
        setActivity((a) => a ? { ...a, participant_count: a.participant_count + 1 } : a);
        setParticipants((ps) => [...ps, {
          user_id: user.id, display_name: user.display_name,
          username: user.username, avatar_url: user.avatar_url ?? null, signed_in: 0,
        }]);
      } else {
        showToast(data.error || "报名失败", "error");
      }
    } finally {
      setParticipating(false);
    }
  }

  async function handleCancelParticipate() {
    if (!user) return;
    setParticipating(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/activities/${id}/participate`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        showToast("已取消报名", "success");
        setIsParticipant(false);
        setActivity((a) => a ? { ...a, participant_count: Math.max(0, a.participant_count - 1) } : a);
        setParticipants((ps) => ps.filter((p) => p.user_id !== user.id));
      } else {
        showToast(data.error || "取消失败", "error");
      }
    } finally {
      setParticipating(false);
    }
  }

  async function handleSignIn() {
    if (!user) { showToast("请先登录", "error"); return; }
    setSigningIn(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/activities/${id}/signin`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        showToast("签到成功！获得 5 积分", "success");
        setIsSignedIn(true);
        setParticipants((ps) => ps.map((p) => p.user_id === user.id ? { ...p, signed_in: 1 } : p));
      } else {
        showToast(data.error || "签到失败", "error");
      }
    } finally {
      setSigningIn(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-text-muted">活动不存在</p>
        <Link href="/activities" className="mt-4 inline-block text-primary hover:underline">返回活动列表</Link>
      </div>
    );
  }

  const { text: statusText, cls: statusCls } = statusLabel(activity.status);
  const isFull = activity.max_participants !== null && activity.participant_count >= activity.max_participants;
  const canJoin = activity.status === "upcoming" || activity.status === "ongoing";
  const canSignIn = isParticipant && !isSignedIn && (activity.status === "ongoing" || activity.status === "upcoming");

  return (
    <div className="min-h-screen bg-bg">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-5 py-3 rounded-xl shadow-float text-sm font-medium transition-all ${
          toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Cover */}
      {activity.cover_image ? (
        <div className="h-72 sm:h-96 overflow-hidden relative">
          <img src={activity.cover_image} alt={activity.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4">
            <Link href="/activities" className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm transition-colors">
              <ArrowLeft size={16} /> 活动档案
            </Link>
          </div>
        </div>
      ) : (
        <div
          className="h-48 flex items-center justify-center text-6xl relative"
          style={{ background: `linear-gradient(135deg, ${activity.category_color || "#8B6F47"}33, ${activity.category_color || "#8B6F47"}66)` }}
        >
          🎪
          <div className="absolute bottom-4 left-4">
            <Link href="/activities" className="flex items-center gap-1.5 text-text-secondary hover:text-primary text-sm transition-colors">
              <ArrowLeft size={16} /> 活动档案
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title & meta */}
            <div className="card p-6">
              <div className="flex flex-wrap items-center gap-2 mb-3">
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
              <div className="flex items-start justify-between gap-3 mb-4">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-text-primary leading-snug">
                  {activity.title}
                </h1>
                <button
                  onClick={handleCopyLink}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-primary/5 hover:border-primary/30 transition-colors text-text-secondary hover:text-primary"
                  title="复制活动链接"
                >
                  {copied ? <Check size={14} className="text-success" /> : <Share2 size={14} />}
                  {copied ? "已复制" : "分享链接"}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-text-secondary">
                <div className="flex items-center gap-2">
                  <Calendar size={15} className="text-primary/60 shrink-0" />
                  <span>{formatDate(activity.activity_date)}</span>
                </div>
                {(activity.start_time || activity.end_time) && (
                  <div className="flex items-center gap-2">
                    <Clock size={15} className="text-primary/60 shrink-0" />
                    <span>{activity.start_time || ""}{activity.end_time ? ` – ${activity.end_time}` : ""}</span>
                  </div>
                )}
                {activity.location && (
                  <div className="flex items-center gap-2">
                    <MapPin size={15} className="text-primary/60 shrink-0" />
                    <span>{activity.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users size={15} className="text-primary/60 shrink-0" />
                  <span>
                    {activity.participant_count} 人已报名
                    {activity.max_participants ? ` / 上限 ${activity.max_participants} 人` : ""}
                  </span>
                </div>
              </div>
              {activity.speaker && (
                <div className="mt-3 pt-3 border-t border-border-light text-sm text-text-secondary">
                  <span className="font-medium text-text-primary">主讲嘉宾：</span>{activity.speaker}
                </div>
              )}
            </div>

            {/* Description */}
            {activity.description && (
              <div className="card p-6">
                <h2 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                  📋 活动介绍
                </h2>
                <div className="prose prose-sm max-w-none text-text-secondary whitespace-pre-wrap leading-relaxed">
                  {activity.description}
                </div>
              </div>
            )}

            {/* Summary (post-event) */}
            {activity.summary && activity.status === "completed" && (
              <div className="card p-6 border-primary/20 bg-primary/5">
                <h2 className="font-semibold text-primary mb-3 flex items-center gap-2">
                  ✨ 活动回顾
                </h2>
                <div className="text-text-secondary whitespace-pre-wrap leading-relaxed text-sm">
                  {activity.summary}
                </div>
              </div>
            )}

            {/* Photos */}
            {photos.length > 0 && (
              <div className="card p-6">
                <h2 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <Camera size={16} className="text-primary/60" /> 活动照片
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative group rounded-lg overflow-hidden aspect-square bg-bg">
                      <img
                        src={photo.image_url}
                        alt={photo.caption || "活动照片"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {photo.caption && (
                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white text-xs line-clamp-2">{photo.caption}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Action card */}
            <div className="card p-5">
              {!user ? (
                <Link
                  href="/login"
                  className="block w-full text-center py-2.5 px-4 bg-primary text-text-inverse rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
                >
                  登录后报名
                </Link>
              ) : isParticipant ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                    <CheckCircle size={16} /> 已报名
                  </div>
                  {isSignedIn ? (
                    <div className="flex items-center gap-2 text-blue-600 text-sm">
                      <CheckCircle size={16} /> 已签到
                    </div>
                  ) : canSignIn ? (
                    <button
                      onClick={handleSignIn}
                      disabled={signingIn}
                      className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {signingIn ? "签到中…" : "现场签到"}
                    </button>
                  ) : null}
                  {canJoin && (
                    <button
                      onClick={handleCancelParticipate}
                      disabled={participating}
                      className="w-full py-2 px-4 border border-border text-text-secondary rounded-lg text-sm hover:border-error/50 hover:text-error disabled:opacity-50 transition-colors"
                    >
                      取消报名
                    </button>
                  )}
                </div>
              ) : canJoin ? (
                isFull ? (
                  <div className="text-center text-sm text-text-muted py-2">名额已满</div>
                ) : (
                  <button
                    onClick={handleParticipate}
                    disabled={participating}
                    className="w-full py-2.5 px-4 bg-primary text-text-inverse rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
                  >
                    {participating ? "报名中…" : "立即报名"}
                  </button>
                )
              ) : (
                <div className="text-center text-sm text-text-muted py-2">活动已结束</div>
              )}
            </div>

            {/* Participants */}
            {participants.length > 0 && (
              <div className="card p-5">
                <h3 className="font-medium text-text-primary mb-3 text-sm flex items-center gap-1.5">
                  <Users size={14} className="text-primary/60" />
                  参与成员 <span className="text-text-muted font-normal">({participants.length})</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {participants.map((p) => (
                    <Link key={p.user_id} href={`/profile/${p.user_id}`}>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                          {p.display_name.charAt(0)}
                        </div>
                        <span className="text-xs font-medium text-primary">{p.display_name}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Points tip */}
            <div className="card p-4 bg-amber-50/50 border-amber-200/50">
              <p className="text-xs text-amber-700 leading-relaxed">
                💡 报名活动 +10 积分，活动签到 +5 积分
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
