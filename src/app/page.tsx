export const dynamic = "force-dynamic";

import { initializeDatabase } from "@/lib/db";
import CategoryCard from "@/components/CategoryCard";
import PostsTable from "@/components/PostsTable";
import Link from "next/link";
import { Users, Calendar, LayoutGrid, Pin, ArrowRight, Star } from "lucide-react";

interface CategoryRow {
  id: number;
  name: string;
  description: string | null;
  moderator_name: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
  post_count: number;
}

interface CategoryBasic {
  id: number;
  name: string;
  color: string;
}

interface AnnouncementPreview {
  id: number;
  title: string;
  image_url: string | null;
  is_pinned: number;
  created_at: string;
}

interface ActivityPreview {
  id: number;
  title: string;
  activity_date: string;
  start_time: string | null;
  location: string | null;
  category_name: string | null;
  category_color: string | null;
  participant_count: number;
  cover_image: string | null;
  status: string;
}

function formatAnnouncementDate(dateStr: string): string {
  const date = new Date(dateStr + "Z");
  return date.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
  });
}

export default async function HomePage() {
  const db = await initializeDatabase();

  const categoriesResult = await db.execute({
    sql: `SELECT c.*, 
      (SELECT COUNT(*) FROM posts WHERE category_id = c.id) as post_count
    FROM categories c
    ORDER BY c.sort_order ASC`,
    args: [],
  });
  const categories = categoriesResult.rows as unknown as CategoryRow[];

  // Extract basic category info for the PostsTable filter dropdown
  const categoryBasics: CategoryBasic[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color || "#8B6F47",
  }));

  // Fetch latest announcements for homepage banner
  const annResult = await db.execute({
    sql: `SELECT id, title, image_url, is_pinned, created_at
         FROM announcements
         WHERE expire_at IS NULL OR expire_at > datetime('now')
         ORDER BY is_pinned DESC, created_at DESC
         LIMIT 3`,
    args: [],
  });
  const latestAnnouncements = annResult.rows as unknown as AnnouncementPreview[];

  // Fetch upcoming activities for homepage
  const actResult = await db.execute({
    sql: `SELECT
        a.id, a.title, a.activity_date, a.start_time, a.location, a.cover_image, a.status,
        c.name as category_name, c.color as category_color,
        (SELECT COUNT(*) FROM activity_participants WHERE activity_id = a.id) as participant_count
      FROM activities a
      LEFT JOIN categories c ON c.id = a.category_id
      WHERE a.status IN ('upcoming', 'ongoing')
      ORDER BY a.activity_date ASC, a.start_time ASC
      LIMIT 3`,
    args: [],
  });
  const upcomingActivities = actResult.rows as unknown as ActivityPreview[];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="gradient-warm py-20 sm:py-28">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-text-inverse mb-4 tracking-wide">
              君说乎
            </h1>
            <div className="font-serif text-lg sm:text-xl text-text-inverse/80 mb-6 space-y-2">
              <p className="tracking-widest">学而时习之，不亦说乎？</p>
              <p className="tracking-widest">有朋自远方来，不亦乐乎？</p>
              <p className="tracking-widest">人不知而不愠，不亦君子乎？</p>
              <p className="mt-3 text-sm sm:text-base text-text-inverse/50 tracking-wide">——《论语·学而》</p>
            </div>
            <p className="max-w-2xl mx-auto text-base sm:text-lg text-text-inverse/70 leading-relaxed mb-10">
              这里是一群都市人的精神自留地。我们相信，真正的富足，
              不在物质的丰盈，而在灵魂的丰盛。在这里，你会遇见同频的灵魂，
              一起学习、成长、创造属于我们的精神家园。
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/community"
                className="px-8 py-3 bg-surface text-primary font-medium rounded-xl hover:shadow-float transition-all"
              >
                探索社群
              </Link>
              <Link
                href="/register"
                className="px-8 py-3 bg-transparent border-2 border-text-inverse/40 text-text-inverse font-medium rounded-xl hover:bg-text-inverse/10 transition-all"
              >
                加入我们
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 48" fill="none" className="w-full">
            <path
              d="M0 48h1440V24c-240 20-480 24-720 12S240 4 0 24v24z"
              fill="var(--color-bg)"
            />
          </svg>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8 -mt-4 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="card p-6 flex flex-wrap items-center justify-center gap-8 sm:gap-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users size={20} className="text-primary" />
              </div>
              <div>
                <div className="text-xl font-bold text-text-primary">500+</div>
                <div className="text-xs text-text-muted">活跃成员</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Calendar size={20} className="text-success" />
              </div>
              <div>
                <div className="text-xl font-bold text-text-primary">500+</div>
                <div className="text-xs text-text-muted">社群活动</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <LayoutGrid size={20} className="text-secondary" />
              </div>
              <div>
                <div className="text-xl font-bold text-text-primary">{categories.length}</div>
                <div className="text-xs text-text-muted">特色板块</div>
              </div>
            </div>
            <Link href="/leaderboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Star size={20} className="text-amber-500" />
              </div>
              <div>
                <div className="text-xl font-bold text-text-primary">🏆</div>
                <div className="text-xs text-text-muted">积分排行</div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Announcements Banner */}
      {latestAnnouncements.length > 0 && (
        <section className="py-8 sm:py-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-xl sm:text-2xl font-bold flex items-center gap-2">
                📢 最新公告
              </h2>
              <Link
                href="/announcements"
                className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary-dark transition-colors"
              >
                查看全部
                <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {latestAnnouncements.map((ann) => (
                <Link
                  key={ann.id}
                  href={`/announcements/${ann.id}`}
                  className="block border border-border rounded-lg overflow-hidden bg-surface hover:border-primary/30 hover:shadow-card transition-all group"
                >
                  {ann.image_url ? (
                    <div className="h-36 overflow-hidden bg-bg">
                      <img
                        src={ann.image_url}
                        alt={ann.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="h-24 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                      <span className="text-3xl">📢</span>
                    </div>
                  )}
                  <div className="p-3.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      {ann.is_pinned === 1 && (
                        <Pin size={12} className="text-error shrink-0" />
                      )}
                      <h3 className="text-sm font-medium text-text-primary line-clamp-1 group-hover:text-primary transition-colors">
                        {ann.title}
                      </h3>
                    </div>
                    <p className="text-xs text-text-muted">
                      {formatAnnouncementDate(ann.created_at)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Upcoming Activities */}
      {upcomingActivities.length > 0 && (
        <section className="py-8 sm:py-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-xl sm:text-2xl font-bold flex items-center gap-2">
                🎪 近期活动
              </h2>
              <Link
                href="/activities"
                className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary-dark transition-colors"
              >
                查看全部
                <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingActivities.map((act) => (
                <Link
                  key={act.id}
                  href={`/activities/${act.id}`}
                  className="block border border-border rounded-lg overflow-hidden bg-surface hover:border-primary/30 hover:shadow-card transition-all group"
                >
                  {act.cover_image ? (
                    <div className="h-36 overflow-hidden bg-bg">
                      <img
                        src={act.cover_image}
                        alt={act.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div
                      className="h-24 flex items-center justify-center text-3xl"
                      style={{ background: `linear-gradient(135deg, ${act.category_color || "#8B6F47"}22, ${act.category_color || "#8B6F47"}44)` }}
                    >
                      🎪
                    </div>
                  )}
                  <div className="p-3.5">
                    <h3 className="text-sm font-medium text-text-primary line-clamp-1 group-hover:text-primary transition-colors mb-1.5">
                      {act.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {new Date(act.activity_date + "T00:00:00").toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}
                      </span>
                      {act.location && (
                        <span className="truncate max-w-[80px]">{act.location}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Categories Grid */}
      <section className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold mb-3">
              {categories.length > 0 ? `${categories.length}大特色板块` : "特色板块"}
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              每一个板块，都有一位用心的主理人。在这里，你一定能找到属于你的那个角落。
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {categories.map((cat) => (
              <CategoryCard
                key={cat.id}
                id={cat.id}
                name={cat.name}
                description={cat.description}
                moderator_name={cat.moderator_name}
                icon={cat.icon}
                color={cat.color}
                post_count={cat.post_count}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Forum Posts Table */}
      <section className="py-12 sm:py-16 bg-surface">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold mb-2">
              📋 社群动态
            </h2>
            <p className="text-text-secondary text-sm">
              实时了解社群最新讨论，加入感兴趣的话题
            </p>
          </div>

          <PostsTable categories={categoryBasics} />
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="gradient-accent rounded-2xl p-10 sm:p-14">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold mb-4">
              加入君说乎，遇见同频的灵魂
            </h2>
            <p className="text-text-secondary mb-8 max-w-lg mx-auto">
              无论你热爱AI科技、艺术人文、健康养生，还是户外运动，
              这里都有一群等待与你相遇的同路人。
            </p>
            <Link
              href="/register"
              className="inline-block px-8 py-3 bg-primary text-text-inverse font-medium rounded-xl hover:bg-primary-dark transition-colors"
            >
              立即加入
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
