"use client";

import { useEffect, useState, useRef, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  is_read: number;
  created_at: string;
  sender_name: string;
  sender_avatar: string | null;
}

interface OtherUser {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr + (dateStr.endsWith("Z") ? "" : "Z"));
  return date.toLocaleTimeString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}



export default function ConversationPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: userIdStr } = use(params);
  const otherUserId = parseInt(userIdStr, 10);

  const { user, loading, token } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [fetching, setFetching] = useState(true);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchMessages = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/messages?withUserId=${otherUserId}&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {
      setError("加载消息失败");
    }
  }, [token, otherUserId]);

  const fetchOtherUser = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${otherUserId}/profile`);
      if (res.ok) {
        const data = await res.json();
        setOtherUser({
          id: otherUserId,
          username: data.user?.username || String(otherUserId),
          display_name: data.user?.display_name || String(otherUserId),
          avatar_url: data.user?.avatar_url || null,
        });
      } else {
        setOtherUser({ id: otherUserId, username: String(otherUserId), display_name: String(otherUserId), avatar_url: null });
      }
    } catch {
      setOtherUser({ id: otherUserId, username: String(otherUserId), display_name: String(otherUserId), avatar_url: null });
    } finally {
      setFetching(false);
    }
  }, [otherUserId]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (!loading && user) {
      fetchMessages();
      fetchOtherUser();
    }
  }, [loading, user, router, fetchMessages, fetchOtherUser]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!content.trim() || sending || !token) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ receiverId: otherUserId, content: content.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "发送失败");
      }
      setContent("");
      await fetchMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送失败");
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (loading || fetching) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-text-muted">
        <div className="animate-pulse">加载中…</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col" style={{ minHeight: "calc(100vh - 5rem)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
        <Link
          href="/messages"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors"
        >
          <ArrowLeft size={16} />
          消息中心
        </Link>
        <div className="flex items-center gap-2 ml-2">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
            {otherUser ? otherUser.display_name.charAt(0) : "?"}
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary leading-tight">
              {otherUser?.display_name || "用户"}
            </p>
            {otherUser?.username && (
              <p className="text-xs text-text-muted">@{otherUser.username}</p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-3 px-4 py-2 bg-error/10 border border-error/20 rounded-lg text-sm text-error">
          {error}
        </div>
      )}

      {/* Message list */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
        {messages.length === 0 && (
          <div className="text-center text-sm text-text-muted py-12">
            还没有消息，快发一条吧 👋
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                {msg.sender_name.charAt(0)}
              </div>
              {/* Bubble */}
              <div
                className={`max-w-[72%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                  isMe
                    ? "bg-primary text-text-inverse rounded-br-sm"
                    : "bg-surface border border-border text-text-primary rounded-bl-sm"
                }`}
              >
                {/* React renders as text node — no XSS risk */}
                {msg.content}
              </div>
            </div>
          );
        })}
        {/* Timestamps shown below each message */}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border border-border rounded-xl bg-surface overflow-hidden">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息… (Enter 发送，Shift+Enter 换行)"
          maxLength={1000}
          rows={3}
          className="w-full px-4 py-3 text-sm text-text-primary bg-transparent placeholder:text-text-muted resize-none focus:outline-none"
        />
        <div className="flex items-center justify-between px-3 py-2 border-t border-border-light bg-bg/50">
          <span className="text-xs text-text-muted">{content.length}/1000</span>
          <button
            onClick={sendMessage}
            disabled={sending || !content.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-text-inverse bg-primary rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={14} />
            {sending ? "发送中…" : "发送"}
          </button>
        </div>
      </div>
    </div>
  );
}
