"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Trophy, Star, Medal } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface LeaderboardEntry {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  total_points: number;
  period_points: number;
}

const CHECKIN_POINTS = 1;
const COMMENT_POINTS = 2;
const ACTIVITY_JOIN_POINTS = 10;
const ACTIVITY_SIGNIN_POINTS = 5;
const POST_POINTS = 20;
const ORGANIZE_POINTS = 50;

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy size={18} className="text-yellow-500" />;
  if (rank === 2) return <Medal size={18} className="text-gray-400" />;
  if (rank === 3) return <Medal size={18} className="text-amber-600" />;
  return <span className="text-sm font-medium text-text-muted w-5 text-center">{rank}</span>;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [period, setPeriod] = useState<"all" | "month">("all");
  const [loading, setLoading] = useState(true);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const fetchLeaderboard = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/points/leaderboard?period=${p}`);
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeaderboard(period); }, [period, fetchLeaderboard]);

  async function handleCheckin() {
    if (!user) { showToast("请先登录", "error"); return; }
    setCheckinLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/points/checkin", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "签到成功！", "success");
        fetchLeaderboard(period);
      } else {
        showToast(data.error || "签到失败", "error");
      }
    } finally {
      setCheckinLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-5 py-3 rounded-xl shadow-float text-sm font-medium ${
          toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="gradient-warm py-14 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-text-inverse mb-3">
            🏆 积分排行榜
          </h1>
          <p className="text-text-inverse/75 text-base max-w-md mx-auto">
            用积分记录你的成长轨迹。每一次参与，都是对社区的贡献。
          </p>
          {user && (
            <button
              onClick={handleCheckin}
              disabled={checkinLoading}
              className="mt-6 px-6 py-2.5 bg-white/20 hover:bg-white/30 text-text-inverse rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
            >
              {checkinLoading ? "签到中…" : "☀️ 每日签到 +1 积分"}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Period tabs */}
        <div className="flex items-center gap-3 mb-6">
          {(["all", "month"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                period === p
                  ? "bg-primary text-text-inverse"
                  : "bg-surface border border-border text-text-secondary hover:border-primary/50"
              }`}
            >
              {p === "all" ? "总排行" : "本月榜"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Leaderboard */}
          <div className="lg:col-span-2">
            <div className="card overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-text-muted text-sm">加载中…</div>
              ) : leaderboard.length === 0 ? (
                <div className="p-8 text-center">
                  <Star size={32} className="text-text-muted/30 mx-auto mb-3" />
                  <p className="text-text-muted text-sm">暂无排行数据，快去参与社区活动吧！</p>
                </div>
              ) : (
                <div className="divide-y divide-border-light">
                  {leaderboard.map((entry, i) => {
                    const rank = i + 1;
                    const isMe = user && user.id === entry.id;
                    return (
                      <Link
                        key={entry.id}
                        href={`/profile/${entry.id}`}
                        className={`flex items-center gap-4 px-5 py-3.5 hover:bg-bg/50 transition-colors ${isMe ? "bg-primary/5" : ""}`}
                      >
                        <div className="w-6 flex items-center justify-center shrink-0">
                          <RankIcon rank={rank} />
                        </div>
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          {entry.avatar_url ? (
                            <img src={entry.avatar_url} alt={entry.display_name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <span className="text-sm font-medium text-primary">{entry.display_name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-text-primary truncate">{entry.display_name}</span>
                            {isMe && <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">我</span>}
                          </div>
                          <span className="text-xs text-text-muted">@{entry.username}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-amber-600">{period === "month" ? entry.period_points : entry.total_points}</div>
                          <div className="text-xs text-text-muted">积分</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Rules */}
          <div>
            <div className="card p-5 sticky top-20">
              <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Star size={15} className="text-amber-500" /> 积分规则
              </h3>
              <div className="space-y-2.5">
                {[
                  { action: "每日签到", points: CHECKIN_POINTS },
                  { action: "评论互动", points: COMMENT_POINTS },
                  { action: "报名活动", points: ACTIVITY_JOIN_POINTS },
                  { action: "活动签到", points: ACTIVITY_SIGNIN_POINTS },
                  { action: "发布帖子", points: POST_POINTS },
                  { action: "组织活动", points: ORGANIZE_POINTS },
                ].map(({ action, points }) => (
                  <div key={action} className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">{action}</span>
                    <span className="font-medium text-amber-600">+{points}</span>
                  </div>
                ))}
              </div>
              {!user && (
                <Link
                  href="/login"
                  className="block mt-4 text-center py-2 bg-primary text-text-inverse rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
                >
                  登录开始积分
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
