"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Conversation {
  other_user_id: number;
  last_message: string;
  last_time: string;
  is_read: number;
  sender_id: number;
  unread_count: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr + (dateStr.endsWith("Z") ? "" : "Z"));
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) {
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "昨天";
  if (diffDays < 7) return `${diffDays}天前`;
  return date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

export default function MessagesPage() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/messages/conversations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {
      setError("加载会话列表失败，请刷新重试");
    } finally {
      setFetching(false);
    }
  }, [token]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (!loading && user) {
      fetchConversations();
    }
  }, [loading, user, router, fetchConversations]);

  if (loading || fetching) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-text-muted">
        <div className="animate-pulse">加载中…</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center gap-3 mb-6">
        <Mail size={22} className="text-primary" />
        <h1 className="font-serif text-2xl font-semibold text-text-primary">消息中心</h1>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">
          {error}
        </div>
      )}

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-text-muted">
          <MessageSquare size={48} className="text-border" />
          <p className="text-sm">还没有私信往来</p>
          <p className="text-xs text-text-muted">在帖子详情页点击「发私信」开始一段对话吧</p>
        </div>
      ) : (
        <ul className="divide-y divide-border-light border border-border rounded-xl overflow-hidden bg-surface">
          {conversations.map((conv) => (
            <li key={conv.other_user_id}>
              <Link
                href={`/messages/${conv.other_user_id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent-light/40 transition-colors"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-base font-semibold text-primary">
                    {conv.display_name.charAt(0)}
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                      {conv.unread_count > 99 ? "99+" : conv.unread_count}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-text-primary truncate">
                      {conv.display_name}
                    </span>
                    <span className="text-xs text-text-muted shrink-0">
                      {formatTime(conv.last_time)}
                    </span>
                  </div>
                  <p
                    className={`text-xs mt-0.5 truncate ${
                      conv.unread_count > 0
                        ? "text-text-primary font-medium"
                        : "text-text-muted"
                    }`}
                  >
                    {conv.sender_id === user?.id ? "我：" : ""}
                    {conv.last_message}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
