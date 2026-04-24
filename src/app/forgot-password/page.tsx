"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";

export default function ForgotPasswordPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!usernameOrEmail.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username_or_email: usernameOrEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "提交失败");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
              <KeyRound size={24} className="text-primary" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-text-primary mb-2">
              找回密码
            </h1>
            <p className="text-sm text-text-muted">
              提交申请后，管理员将尽快与您联系
            </p>
          </div>

          {success ? (
            <div className="space-y-5">
              <div className="px-5 py-4 bg-green-50 border border-green-200 rounded-xl text-center">
                <p className="text-green-700 font-medium mb-1">✅ 申请已提交成功</p>
                <p className="text-sm text-green-600">
                  密码重置申请已提交，请联系管理员（微信：junshuohu）获取新密码
                </p>
              </div>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-primary text-text-inverse font-medium rounded-lg hover:bg-primary-dark transition-colors"
              >
                <ArrowLeft size={16} />
                返回登录
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="usernameOrEmail"
                  className="block text-sm font-medium text-text-primary mb-1.5"
                >
                  用户名 / 邮箱
                </label>
                <input
                  id="usernameOrEmail"
                  type="text"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="请输入注册时的用户名或邮箱"
                  className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                />
              </div>

              {error && (
                <div className="px-4 py-3 bg-error/5 border border-error/20 rounded-lg">
                  <p className="text-sm text-error">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !usernameOrEmail.trim()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-text-inverse font-medium rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "提交中..." : "提交申请"}
              </button>

              <p className="text-center text-sm text-text-muted">
                想起密码了？{" "}
                <Link
                  href="/login"
                  className="text-primary hover:text-primary-dark font-medium transition-colors"
                >
                  返回登录
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
