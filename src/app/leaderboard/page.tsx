"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trophy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface LeaderboardUser {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  total_points: number;
  created_at: string;
}

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((res) => res.json())
      .then((data) => {
        if (data.users) setUsers(data.users);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const myRank = user
    ? users.findIndex((u) => u.id === user.id) + 1
    : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* Breadcrumb */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors mb-8"
      >
        <ArrowLeft size={16} />
        返回首页
      </Link>

      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-4">
          <Trophy size={32} className="text-amber-500" />
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-text-primary mb-2">
          积分排行榜
        </h1>
        <p className="text-text-muted">TOP 50 积分最高的社群成员</p>
        {user && myRank > 0 && (
          <p className="mt-2 text-sm text-primary font-medium">
            你当前排名第 {myRank} 名
          </p>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="card p-12 text-center text-text-muted">
          暂无积分数据
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Top 3 highlight */}
          {users.slice(0, 3).length > 0 && (
            <div className="grid grid-cols-3 gap-0 border-b border-border bg-gradient-to-b from-amber-50/60 to-transparent p-6">
              {[users[1], users[0], users[2]].map((u, podiumIdx) => {
                if (!u) return <div key={podiumIdx} />;
                const actualRank = users.indexOf(u) + 1;
                const heights = ["h-24", "h-32", "h-20"];
                const isMe = user?.id === u.id;
                return (
                  <div key={u.id} className={`flex flex-col items-center justify-end ${heights[podiumIdx]}`}>
                    <div className="text-2xl mb-1">{RANK_MEDALS[actualRank - 1]}</div>
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold mb-1 ring-2 ${
                        isMe ? "ring-primary bg-primary/20 text-primary" : "ring-amber-200 bg-amber-100 text-amber-700"
                      }`}
                    >
                      {u.display_name.charAt(0)}
                    </div>
                    <p className={`text-xs font-semibold truncate max-w-[80px] text-center ${isMe ? "text-primary" : "text-text-primary"}`}>
                      {u.display_name}
                    </p>
                    <p className="text-xs font-bold text-amber-600">{u.total_points} 分</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full list */}
          <div className="divide-y divide-border-light">
            {users.map((u, index) => {
              const rank = index + 1;
              const isMe = user?.id === u.id;
              return (
                <div
                  key={u.id}
                  className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${
                    isMe
                      ? "bg-primary/5 border-l-2 border-primary"
                      : "hover:bg-accent-light/30"
                  }`}
                >
                  {/* Rank */}
                  <div className="w-8 text-center shrink-0">
                    {rank <= 3 ? (
                      <span className="text-lg">{RANK_MEDALS[rank - 1]}</span>
                    ) : (
                      <span className={`text-sm font-bold ${isMe ? "text-primary" : "text-text-muted"}`}>
                        {rank}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      isMe ? "bg-primary/20 text-primary" : "bg-accent-light text-text-secondary"
                    }`}
                  >
                    {u.display_name.charAt(0)}
                  </div>

                  {/* Name & username */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isMe ? "text-primary" : "text-text-primary"}`}>
                      {u.display_name}
                      {isMe && (
                        <span className="ml-1.5 text-xs font-normal text-primary/70">（你）</span>
                      )}
                    </p>
                    <p className="text-xs text-text-muted truncate">@{u.username}</p>
                  </div>

                  {/* Points */}
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${isMe ? "text-primary" : "text-text-primary"}`}>
                      {u.total_points.toLocaleString()}
                    </p>
                    <p className="text-xs text-text-muted">积分</p>
                  </div>

                  {/* Join date */}
                  <div className="hidden sm:block text-right shrink-0 min-w-[80px]">
                    <p className="text-xs text-text-muted">
                      {new Date(u.created_at).toLocaleDateString("zh-CN", { year: "numeric", month: "short" })}
                    </p>
                    <p className="text-xs text-text-muted">加入</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
