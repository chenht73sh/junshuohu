"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  FileText,
  LayoutGrid,
  BookOpen,
  Megaphone,
  Calendar,
  Menu,
  X,
  Shield,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const sidebarItems = [
  { label: "仪表盘", href: "/admin", icon: LayoutDashboard },
  { label: "用户管理", href: "/admin/users", icon: Users },
  { label: "帖子管理", href: "/admin/posts", icon: FileText },
  { label: "板块管理", href: "/admin/categories", icon: LayoutGrid },
  { label: "公告管理", href: "/admin/announcements", icon: Megaphone },
  { label: "课程管理", href: "/admin/courses", icon: BookOpen },
  { label: "活动管理", href: "/admin/activities", icon: Calendar },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || (user.role !== "admin" && user.role !== "moderator"))) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "moderator")) {
    return null;
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-16 left-0 z-50 lg:z-auto
          w-64 h-[calc(100vh-4rem)] overflow-y-auto
          bg-gradient-to-b from-[#6B5535] to-[#5A4628] text-white
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-amber-300" />
            <span className="font-serif text-lg font-semibold">管理后台</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 hover:bg-white/10 rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* User info */}
        <div className="px-5 py-4 border-b border-white/10">
          <p className="text-sm text-amber-200 truncate">{user.display_name}</p>
          <p className="text-xs text-white/50 mt-0.5">
            {user.role === "admin" ? "管理员" : "版主"}
          </p>
        </div>

        {/* Nav items */}
        <nav className="px-3 py-4 space-y-1">
          {sidebarItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium
                  transition-colors duration-150
                  ${
                    isActive
                      ? "bg-white/15 text-amber-200"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }
                `}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Back to site */}
        <div className="px-3 mt-auto pb-4">
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            ← 返回网站
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Mobile header bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-surface">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-text-secondary hover:text-primary rounded-lg hover:bg-accent-light/50 transition-colors"
          >
            <Menu size={20} />
          </button>
          <h2 className="text-sm font-medium text-text-secondary">管理后台</h2>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
