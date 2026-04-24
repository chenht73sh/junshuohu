export const dynamic = "force-dynamic";

import { initializeDatabase } from "@/lib/db";
import CategoryCard from "@/components/CategoryCard";
import PostsTable from "@/components/PostsTable";
import Link from "next/link";
import { Users, Calendar, LayoutGrid, Pin, ArrowRight, Star, BookOpen, Clock, TrendingUp } from "lucide-react";

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

interface HeroContent {
  site_name: string;
  subtitle: string;
  description: string;
  cta_text: string;
  cta_button: string;
}

const defaultHero: HeroContent = {
  site_name: "君说乎",
  subtitle: "数字家园",
  description: "这里是一群都市人的精神自留地。我们相信，真正的富足，不是物质的堆砌，而是灵魂的丰盈。",
  cta_text: "加入君说乎，遇见同频的灵魂",
  cta_button: "立即加入",
};

export default async function HomePage() {
  const db = await initializeDatabase();

  // Read hero_content from site_settings
  let hero: HeroContent = defaultHero;
  try {
    const heroResult = await db.execute({
      sql: "SELECT value FROM site_settings WHERE key = ?",
      args: ["hero_content"],
    });
    if (heroResult.rows.length > 0) {
      hero = JSON.parse(heroResult.rows[0].value as string);
    }
  } catch {
    // Use default hero content on error
  }

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
              {hero.site_name}
            </h1>
            <div className="font-serif text-lg sm:text-xl text-text-inverse/80 mb-6 space-y-2">
              <p className="tracking-widest">学而时习之，不亦说乎？</p>
              <p className="tracking-widest">有朋自远方来，不亦乐乎？</p>
              <p className="tracking-widest">人不知而不愠，不亦君子乎？</p>
              <p className="mt-3 text-sm sm:text-base text-text-inverse/50 tracking-wide">——《论语·学而》</p>
            </div>
            <p className="max-w-2xl mx-auto text-base sm:text-lg text-text-inverse/70 leading-relaxed mb-10">
              {hero.description}
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
                <Clock size={20} className="text-primary" />
              </div>
              <div>
                <div className="text-xl font-bold text-text-primary">10年</div>
                <div className="text-xs text-text-muted">社群历史</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Calendar size={20} className="text-success" />
              </div>
              <div>
                <div className="text-xl font-bold text-text-primary">500+</div>
                <div className="text-xs text-text-muted">线上线下活动</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <LayoutGrid size={20} className="text-secondary" />
              </div>
              <div>
                <div className="text-xl font-bold text-text-primary">9大</div>
                <div className="text-xs text-text-muted">特色板块</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <BookOpen size={20} className="text-amber-500" />
              </div>
              <div>
                <div className="text-xl font-bold text-text-primary">多元</div>
                <div className="text-xs text-text-muted">课程体系</div>
              </div>
            </div>
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
              {categories.length > 0 ? `${categories.length}大特色板块` : "9大特色板块"}
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

      {/* Five Core Course Tracks */}
      <section className="py-12 sm:py-16 bg-surface">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold mb-3">✨ 五大课程体系</h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              由各领域专家主理，涵盖科技、健康、艺术、法律、思维——总有一门课，能点亮你。
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: "🤖",
                color: "#4A90D9",
                title: "拥抱AI",
                instructor: "陈工主讲",
                count: "12门课程",
                desc: "从ChatGPT到Cursor，手把手带你用AI创业、提效、开启副业新可能。",
              },
              {
                icon: "🌿",
                color: "#2ECC71",
                title: "自然养生",
                instructor: "谢老师主理",
                count: "经络·本草·身心",
                desc: "听身体说话，以自然之法养护生命，找回与自己和解的能力。",
              },
              {
                icon: "🎨",
                color: "#9B59B6",
                title: "艺术人文",
                instructor: "萤火虫·小黑鱼老师",
                count: "美学·文化·创作",
                desc: "在美的面前，我们都只是孩子。艺术滋养灵魂，人文丰盈生命。",
              },
              {
                icon: "🧩",
                color: "#E67E22",
                title: "思辨与游戏",
                instructor: "周溪乔老师主理",
                count: "批判性思维·逻辑",
                desc: "思维是一种游戏，游戏是一种哲学。训练你看透本质的眼睛。",
              },
              {
                icon: "⚖️",
                color: "#E74C3C",
                title: "法律沙龙",
                instructor: "刘律师主理",
                count: "实用法律科普",
                desc: "在不确定的时代，给你确定的底气。聊财富传承、合同风险、日常维权。",
              },
              {
                icon: "📚",
                color: "#8B6F47",
                title: "更多板块",
                instructor: "持续开放招募中",
                count: "跑团·徒步·HR…",
                desc: "乐走徒友、跑团、HR社群、微习惯、国王与天使…还有更多等你发现。",
              },
            ].map((track) => (
              <Link
                key={track.title}
                href="/courses"
                className="block border border-border rounded-xl p-5 bg-bg hover:border-primary/30 hover:shadow-card transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                    style={{ backgroundColor: `${track.color}18` }}
                  >
                    {track.icon}
                  </div>
                  <div>
                    <h3
                      className="font-semibold text-base group-hover:text-primary transition-colors"
                      style={{ color: track.color }}
                    >
                      {track.title}
                    </h3>
                    <p className="text-xs text-text-muted">{track.instructor}</p>
                  </div>
                </div>
                <p className="text-xs font-medium text-text-secondary mb-1.5">{track.count}</p>
                <p className="text-sm text-text-muted leading-relaxed">{track.desc}</p>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-text-inverse text-sm font-medium rounded-xl hover:bg-primary-dark transition-colors"
            >
              <BookOpen size={16} />
              查看全部课程
            </Link>
          </div>
        </div>
      </section>

      {/* Member Tiers */}
      <section className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold mb-3">🌱 三级成员体系</h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              不只是加入，更是成长。从参与者到共建者，每一步都有意义。
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                level: "L1",
                title: "参与者",
                color: "#4A90D9",
                badge: "🌱",
                desc: "加入社群，参与活动与课程，感受君说乎的温度与氛围。",
                perks: ["参与线上线下活动", "访问社群帖子", "课程报名资格", "积分签到"],
              },
              {
                level: "L2",
                title: "同行者",
                subtitle: "运营官",
                color: "#8B6F47",
                badge: "🌿",
                desc: "深度参与社群运营，成为某一板块或方向的主理人。",
                perks: ["担任板块运营官", "协助组织活动", "优先课程资源", "专属社群认证"],
                highlight: true,
              },
              {
                level: "L3",
                title: "共建者",
                subtitle: "战略合伙人",
                color: "#E67E22",
                badge: "🔥",
                desc: "共同定义君说乎的未来，参与战略决策与价值共创。",
                perks: ["参与战略规划", "课程内容共创", "品牌联名权益", "社群利益分配"],
              },
            ].map((tier) => (
              <div
                key={tier.level}
                className={`relative border rounded-xl p-6 bg-bg transition-all ${
                  tier.highlight
                    ? "border-primary shadow-card"
                    : "border-border hover:border-primary/30 hover:shadow-card"
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 text-xs font-bold bg-primary text-text-inverse rounded-full">
                      核心角色
                    </span>
                  </div>
                )}
                <div className="text-center mb-4">
                  <div className="text-3xl mb-2">{tier.badge}</div>
                  <div
                    className="text-xs font-bold mb-1 tracking-widest"
                    style={{ color: tier.color }}
                  >
                    {tier.level}
                  </div>
                  <h3 className="font-serif font-bold text-lg text-text-primary">
                    {tier.title}
                  </h3>
                  {tier.subtitle && (
                    <p className="text-xs text-text-muted mt-0.5">{tier.subtitle}</p>
                  )}
                </div>
                <p className="text-sm text-text-secondary leading-relaxed mb-4 text-center">
                  {tier.desc}
                </p>
                <ul className="space-y-2">
                  {tier.perks.map((perk) => (
                    <li key={perk} className="flex items-center gap-2 text-sm text-text-secondary">
                      <span style={{ color: tier.color }}>✓</span>
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-text-inverse text-sm font-medium rounded-xl hover:bg-primary-dark transition-colors"
            >
              <Users size={16} />
              立即加入，开启同频之旅
            </Link>
          </div>
        </div>
      </section>

      {/* 2026 Roadmap */}
      <section className="py-12 sm:py-16 bg-surface">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold mb-3">
              🗓️ 2026 发展规划
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              君说乎数字家园正在全新启航。我们有清晰的节奏，也期待你与我们同行。
            </p>
          </div>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 sm:left-1/2 top-0 bottom-0 w-0.5 bg-border -translate-x-1/2 hidden sm:block" />
            <div className="space-y-6">
              {[
                {
                  period: "2026年5月",
                  phase: "基础搭建",
                  icon: "🏗️",
                  color: "#4A90D9",
                  desc: "搭建数字家园平台，完善社群基础设施，建立运营规范与内容体系框架。",
                  side: "left",
                },
                {
                  period: "2026年6—9月",
                  phase: "冷启动验证",
                  icon: "🧪",
                  color: "#2ECC71",
                  desc: "引入核心种子用户，验证课程产品与社群运营模型，持续迭代优化。",
                  side: "right",
                },
                {
                  period: "2026年10—12月",
                  phase: "稳定运营",
                  icon: "📈",
                  color: "#E67E22",
                  desc: "建立稳定的课程排期、活动节奏与成员增长机制，完成年度目标。",
                  side: "left",
                },
                {
                  period: "2027年",
                  phase: "规模化复制",
                  icon: "🚀",
                  color: "#9B59B6",
                  desc: "在验证成功模式的基础上，扩大影响力，探索多城市落地与生态合作。",
                  side: "right",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`relative flex flex-col sm:flex-row items-start gap-4 ${
                    item.side === "right" ? "sm:flex-row-reverse" : ""
                  }`}
                >
                  {/* Center dot */}
                  <div className="hidden sm:flex absolute left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-bg border-2 items-center justify-center text-lg shadow-card z-10"
                       style={{ borderColor: item.color }}>
                    {item.icon}
                  </div>
                  {/* Content card */}
                  <div className={`sm:w-[calc(50%-2rem)] ${item.side === "right" ? "sm:ml-auto" : ""}`}>
                    <div className="border border-border rounded-xl p-5 bg-bg hover:shadow-card transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="sm:hidden text-xl">{item.icon}</span>
                        <span
                          className="text-xs font-bold tracking-wide"
                          style={{ color: item.color }}
                        >
                          {item.period}
                        </span>
                      </div>
                      <h3 className="font-serif font-semibold text-base text-text-primary mb-1.5">
                        {item.phase}
                      </h3>
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                  {/* Spacer for opposite side */}
                  <div className="hidden sm:block sm:w-[calc(50%-2rem)]" />
                </div>
              ))}
            </div>
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
              {hero.cta_text}
            </h2>
            <p className="text-text-secondary mb-8 max-w-lg mx-auto">
              无论你热爱AI科技、艺术人文、健康养生，还是户外运动，
              这里都有一群等待与你相遇的同路人。
            </p>
            <Link
              href="/register"
              className="inline-block px-8 py-3 bg-primary text-text-inverse font-medium rounded-xl hover:bg-primary-dark transition-colors"
            >
              {hero.cta_button}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
