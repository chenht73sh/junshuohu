"use client";

import Link from "next/link";
import { useState, useRef, useEffect, Suspense } from "react";
import { Menu, X, User, LogOut, ChevronDown, Shield, Search, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  visible: boolean;
}

const defaultNavItems: NavItem[] = [
  { label: "首页", href: "/", visible: true },
  { label: "社群动态", href: "/community", visible: true },
  { label: "社群板块", href: "/categories", visible: true },
  { label: "课程报名", href: "/courses", visible: true },
  { label: "论坛公告", href: "/announcements", visible: true },
  { label: "活动档案", href: "/activities", visible: true },
  { label: "积分排行", href: "/leaderboard", visible: true },
  { label: "关于我们", href: "/about", visible: true },
];

/* ── Desktop Search Box ── */
function DesktopSearchBox() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setValue("");
  }

  return (
    <form onSubmit={handleSubmit} className="relative hidden md:flex items-center">
      <Search
        size={14}
        className="absolute left-2.5 text-text-muted pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="搜索帖子…"
        maxLength={100}
        className={`pl-8 pr-3 py-1.5 text-sm rounded-lg border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all duration-200 ${
          focused ? "w-64 border-primary/50" : "w-44 border-border"
        }`}
      />
    </form>
  );
}

/* ── Messages Icon with unread badge ── */
function MessagesIcon() {
  const { user, token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || !token) {
      setUnreadCount(0);
      return;
    }
    let cancelled = false;
    async function fetchUnread() {
      try {
        const res = await fetch("/api/messages/unread-count", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setUnreadCount(data.count || 0);
        }
      } catch {
        // silently ignore
      }
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, token]);

  if (!user) return null;

  return (
    <Link
      href="/messages"
      className="relative flex items-center justify-center w-8 h-8 rounded-lg text-text-secondary hover:text-primary hover:bg-accent-light/50 transition-colors"
      aria-label="消息"
      title="消息"
    >
      <Mail size={18} />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, loading, logout } = useAuth();
  const [navItems, setNavItems] = useState<NavItem[]>(defaultNavItems);
  const router = useRouter();

  // Fetch nav menu from API
  useEffect(() => {
    fetch("/api/settings?key=nav_menu")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings?.nav_menu && Array.isArray(data.settings.nav_menu)) {
          setNavItems(data.settings.nav_menu);
        }
      })
      .catch(() => {
        // Keep default nav items on error
      });
  }, []);

  const visibleNavItems = navItems.filter((item) => item.visible);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    logout();
    setDropdownOpen(false);
    setMobileOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl">📖</span>
            <span className="font-serif text-xl font-semibold text-primary group-hover:text-primary-dark transition-colors">
              君说乎
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-primary hover:bg-accent-light/50 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right side — Desktop */}
          <div className="hidden md:flex items-center gap-3">
            <Suspense fallback={null}>
              <DesktopSearchBox />
            </Suspense>
            <MessagesIcon />
            {loading ? (
              <div className="w-20 h-8 rounded-lg bg-border-light animate-pulse" />
            ) : user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-accent-light/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {user.display_name.charAt(0)}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-text-primary max-w-[100px] truncate">
                    {user.display_name}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-text-muted transition-transform ${
                      dropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-lg shadow-float py-1 z-50">
                    <div className="px-4 py-2 border-b border-border-light">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {user.display_name}
                      </p>
                      <p className="text-xs text-text-muted">@{user.username}</p>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary hover:text-primary hover:bg-accent-light/50 transition-colors"
                    >
                      <User size={14} />
                      个人中心
                    </Link>
                    {(user.role === "admin" || user.role === "moderator") && (
                      <Link
                        href="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary hover:text-primary hover:bg-accent-light/50 transition-colors"
                      >
                        <Shield size={14} />
                        管理后台
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-text-secondary hover:text-error hover:bg-error/5 transition-colors"
                    >
                      <LogOut size={14} />
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-primary transition-colors"
                >
                  登录
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-medium text-text-inverse bg-primary hover:bg-primary-dark rounded-lg transition-colors"
                >
                  注册
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-text-secondary hover:text-primary transition-colors"
            aria-label="切换菜单"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-surface">
          <nav className="px-4 py-3 space-y-1">
            {/* Mobile Search */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = mobileSearch.trim();
                if (!q) return;
                setMobileOpen(false);
                setMobileSearch("");
                router.push(`/search?q=${encodeURIComponent(q)}`);
              }}
              className="flex items-center gap-2 mb-3"
            >
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                />
                <input
                  type="text"
                  value={mobileSearch}
                  onChange={(e) => setMobileSearch(e.target.value)}
                  placeholder="搜索帖子…"
                  maxLength={100}
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-border bg-bg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <button
                type="submit"
                className="p-2 text-text-muted hover:text-primary rounded-lg border border-border hover:border-primary transition-colors"
              >
                <Search size={16} />
              </button>
            </form>

            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-primary hover:bg-accent-light/50 transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-border-light">
              {loading ? (
                <div className="h-10 rounded-lg bg-border-light animate-pulse" />
              ) : user ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {user.display_name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {user.display_name}
                      </p>
                      <p className="text-xs text-text-muted">@{user.username}</p>
                    </div>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-text-secondary hover:text-primary hover:bg-accent-light/50 transition-colors"
                  >
                    <User size={14} />
                    个人中心
                  </Link>
                  <Link
                    href="/messages"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-text-secondary hover:text-primary hover:bg-accent-light/50 transition-colors"
                  >
                    <Mail size={14} />
                    消息中心
                  </Link>
                  {(user.role === "admin" || user.role === "moderator") && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-text-secondary hover:text-primary hover:bg-accent-light/50 transition-colors"
                    >
                      <Shield size={14} />
                      管理后台
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm text-text-secondary hover:text-error hover:bg-error/5 transition-colors"
                  >
                    <LogOut size={14} />
                    退出登录
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center px-4 py-2.5 text-sm font-medium text-text-secondary border border-border rounded-lg hover:border-primary hover:text-primary transition-colors"
                  >
                    登录
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center px-4 py-2.5 text-sm font-medium text-text-inverse bg-primary hover:bg-primary-dark rounded-lg transition-colors"
                  >
                    注册
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
