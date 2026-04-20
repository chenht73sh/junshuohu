"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [form, setForm] = useState({
    username: "",
    display_name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    invite_code: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (!form.username.trim() || !form.display_name.trim() || !form.phone.trim() || !form.password || !form.invite_code.trim()) {
      setError("请填写所有必填项");
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(form.phone.trim())) {
      setError("请输入正确的手机号码");
      return;
    }

    if (form.username.trim().length < 2) {
      setError("用户名至少需要2个字符");
      return;
    }

    if (form.password.length < 6) {
      setError("密码至少需要6位");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("邮箱格式不正确");
      return;
    }

    setSubmitting(true);

    try {
      await register({
        username: form.username.trim(),
        display_name: form.display_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        invite_code: form.invite_code.trim(),
      });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="card p-8 sm:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
              <span className="text-2xl">🌱</span>
            </div>
            <h1 className="font-serif text-2xl font-bold text-text-primary mb-2">
              加入君说乎
            </h1>
            <p className="text-sm text-text-muted">
              在这里，遇见同频的灵魂
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-text-primary mb-1.5"
              >
                用户名 <span className="text-error">*</span>
              </label>
              <input
                id="username"
                type="text"
                value={form.username}
                onChange={(e) => updateField("username", e.target.value)}
                placeholder="字母、数字，2-30位"
                autoComplete="username"
                maxLength={30}
                className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="display_name"
                className="block text-sm font-medium text-text-primary mb-1.5"
              >
                显示名称 <span className="text-error">*</span>
              </label>
              <input
                id="display_name"
                type="text"
                value={form.display_name}
                onChange={(e) => updateField("display_name", e.target.value)}
                placeholder="在社区中显示的名字"
                maxLength={50}
                className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-text-primary mb-1.5"
              >
                邮箱
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="选填，用于找回密码"
                autoComplete="email"
                className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-text-primary mb-1.5"
              >
                手机号 <span className="text-error">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="请输入手机号码"
                autoComplete="tel"
                maxLength={20}
                className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="invite_code"
                className="block text-sm font-medium text-text-primary mb-1.5"
              >
                邀请码 <span className="text-error">*</span>
              </label>
              <input
                id="invite_code"
                type="text"
                value={form.invite_code}
                onChange={(e) => updateField("invite_code", e.target.value)}
                placeholder="请输入管理员提供的邀请码"
                maxLength={50}
                className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text-primary mb-1.5"
              >
                密码 <span className="text-error">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  placeholder="至少6位"
                  autoComplete="new-password"
                  className="w-full px-4 py-3 pr-12 bg-bg border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-secondary transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-text-primary mb-1.5"
              >
                确认密码 <span className="text-error">*</span>
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                placeholder="再次输入密码"
                autoComplete="new-password"
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
              disabled={
                submitting ||
                !form.username.trim() ||
                !form.display_name.trim() ||
                !form.phone.trim() ||
                !form.password ||
                !form.confirmPassword ||
                !form.invite_code.trim()
              }
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-text-inverse font-medium rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <UserPlus size={16} />
              {submitting ? "注册中..." : "注册"}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-text-muted mt-6">
            已有账号？{" "}
            <Link
              href="/login"
              className="text-primary hover:text-primary-dark font-medium transition-colors"
            >
              去登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
