import { createClient, type Client } from "@libsql/client";
import bcryptjs from "bcryptjs";

const db: Client = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:./data/junshuohu.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

let migrated = false;

export async function getDb(): Promise<Client> {
  if (!migrated) {
    await migrateDatabase();
    migrated = true;
  }
  return db;
}

async function migrateDatabase(): Promise<void> {
  await db.batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        avatar_url TEXT,
        role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin', 'moderator', 'member')),
        bio TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        moderator_name TEXT,
        icon TEXT,
        color TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        author_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        is_pinned INTEGER NOT NULL DEFAULT 0,
        is_featured INTEGER NOT NULL DEFAULT 0,
        view_count INTEGER NOT NULL DEFAULT 0,
        video_url TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (author_id) REFERENCES users(id),
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        author_id INTEGER NOT NULL,
        post_id INTEGER NOT NULL,
        parent_id INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (author_id) REFERENCES users(id),
        FOREIGN KEY (post_id) REFERENCES posts(id),
        FOREIGN KEY (parent_id) REFERENCES comments(id)
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        category_id INTEGER NOT NULL,
        instructor TEXT NOT NULL,
        start_time TEXT,
        location TEXT,
        max_participants INTEGER,
        current_participants INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed', 'completed')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS enrollments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (course_id) REFERENCES courses(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(course_id, user_id)
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS uploaded_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        data TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS post_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (post_id) REFERENCES posts(id)
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS post_attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        file_type TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (post_id) REFERENCES posts(id)
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        image_url TEXT,
        category_id INTEGER,
        author_id INTEGER NOT NULL,
        is_pinned INTEGER NOT NULL DEFAULT 0,
        expire_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (author_id) REFERENCES users(id)
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        category_id INTEGER,
        speaker TEXT,
        location TEXT,
        activity_date TEXT NOT NULL,
        start_time TEXT,
        end_time TEXT,
        max_participants INTEGER,
        cover_image TEXT,
        summary TEXT,
        status TEXT NOT NULL DEFAULT 'upcoming'
          CHECK(status IN ('upcoming','ongoing','completed','cancelled')),
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS activity_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        activity_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        signed_in INTEGER DEFAULT 0,
        signed_in_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(activity_id, user_id)
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS activity_photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        activity_id INTEGER NOT NULL,
        image_url TEXT NOT NULL,
        caption TEXT,
        uploaded_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS activity_materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        activity_id INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        file_url TEXT NOT NULL,
        file_size INTEGER,
        uploaded_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS user_profiles (
        user_id INTEGER PRIMARY KEY,
        avatar TEXT,
        bio TEXT,
        interests TEXT,
        expertise TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS point_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        points INTEGER NOT NULL,
        action TEXT NOT NULL,
        description TEXT,
        reference_id INTEGER,
        reference_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS invite_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        created_by INTEGER NOT NULL,
        used_by INTEGER,
        max_uses INTEGER NOT NULL DEFAULT 10,
        used_count INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        note TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        used_at TEXT,
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (used_by) REFERENCES users(id)
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS site_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS login_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip TEXT NOT NULL,
        username TEXT,
        success INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS password_reset_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username_or_email TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        handled_at DATETIME
      )`,
      args: [],
    },
  ], "write");

  // Add total_points column to users if it doesn't exist (idempotent via try/catch)
  try {
    await db.execute({ sql: "ALTER TABLE users ADD COLUMN total_points INTEGER DEFAULT 0", args: [] });
  } catch {
    // Column already exists — fine
  }

  // Add phone column to users if it doesn't exist (idempotent via try/catch)
  try {
    await db.execute({ sql: "ALTER TABLE users ADD COLUMN phone TEXT", args: [] });
  } catch {
    // Column already exists — fine
  }

  // Create indexes (separate batch since they reference tables created above)
  await db.batch([
    { sql: "CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category_id)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_post_images_post ON post_images(post_id)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_post_attachments_post ON post_attachments(post_id)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON announcements(is_pinned DESC, created_at DESC)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_announcements_author ON announcements(author_id)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(activity_date DESC)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_act_participants_activity ON activity_participants(activity_id)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_act_participants_user ON activity_participants(user_id)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_act_photos_activity ON activity_photos(activity_id)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_act_materials_activity ON activity_materials(activity_id)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_point_records_user ON point_records(user_id)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_point_records_action ON point_records(action)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_point_records_created ON point_records(created_at DESC)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_invite_codes_active ON invite_codes(is_active)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip, created_at)", args: [] },
    {
      sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_checkin_user_date
            ON point_records(user_id, action, date(created_at,'localtime'))
            WHERE action = 'daily_checkin'`,
      args: [],
    },
  ], "write");
}

export async function seedCategories(): Promise<void> {
  const countResult = await db.execute({ sql: "SELECT COUNT(*) as cnt FROM categories", args: [] });
  const cnt = countResult.rows[0].cnt as number;
  if (cnt > 0) return;

  const categories = [
    { name: "AI应用交流", moderator_name: "陈工", description: "探索AI技术，让科技温暖生活", icon: "cpu", color: "#4A90D9", sort_order: 1 },
    { name: "艺术人文", moderator_name: "萤火虫老师、小黑鱼老师", description: "在美的面前，我们都只是孩子", icon: "palette", color: "#9B59B6", sort_order: 2 },
    { name: "健康养生", moderator_name: "谢老师", description: "听，身体在说话", icon: "heart-pulse", color: "#2ECC71", sort_order: 3 },
    { name: "微普法", moderator_name: "刘律师", description: "在不确定的时代，给你确定的底气", icon: "scale", color: "#E74C3C", sort_order: 4 },
    { name: "乐走徒友", moderator_name: "Jenny", description: "用脚步丈量世界", icon: "mountain", color: "#F39C12", sort_order: 5 },
    { name: "跑团", moderator_name: "赵队", description: "奔跑中遇见更好的自己", icon: "footprints", color: "#E67E22", sort_order: 6 },
    { name: "HR社群", moderator_name: "吴杰", description: "职场成长，共同进步", icon: "briefcase", color: "#3498DB", sort_order: 7 },
    { name: "国王与天使", moderator_name: "Amanda", description: "心灵成长，温暖同行", icon: "crown", color: "#E91E63", sort_order: 8 },
    { name: "微习惯", moderator_name: "赛帅老师", description: "小习惯，大改变", icon: "target", color: "#00BCD4", sort_order: 9 },
  ];

  const stmts = categories.map((cat) => ({
    sql: `INSERT OR IGNORE INTO categories (name, moderator_name, description, icon, color, sort_order)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [cat.name, cat.moderator_name, cat.description, cat.icon, cat.color, cat.sort_order],
  }));

  await db.batch(stmts, "write");
}

export async function seedAdmin(): Promise<void> {
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || "junshuohu2026";
  const passwordHash = bcryptjs.hashSync(adminPassword, 10);

  await db.batch([
    {
      sql: `INSERT OR IGNORE INTO users (username, email, password_hash, display_name, role, bio)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: ["admin", "admin@junshuohu.com", passwordHash, "管理员", "admin", "君说乎数字家园管理员"],
    },
    {
      sql: `INSERT OR IGNORE INTO users (username, email, password_hash, display_name, role, bio)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: ["junjun", null, passwordHash, "君君", "admin", "君说乎数字家园管理员"],
    },
    {
      sql: `INSERT OR IGNORE INTO users (username, email, password_hash, display_name, role, bio)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: ["huhu", null, passwordHash, "乎乎", "admin", "君说乎数字家园管理员"],
    },
  ], "write");
}

export async function seedCourses(): Promise<void> {
  const countResult = await db.execute({ sql: "SELECT COUNT(*) as cnt FROM courses", args: [] });
  const cnt = countResult.rows[0].cnt as number;
  if (cnt > 0) return;

  const aiCatResult = await db.execute({ sql: "SELECT id FROM categories WHERE name = ?", args: ["AI应用交流"] });
  const healthCatResult = await db.execute({ sql: "SELECT id FROM categories WHERE name = ?", args: ["健康养生"] });
  const lawCatResult = await db.execute({ sql: "SELECT id FROM categories WHERE name = ?", args: ["微普法"] });

  if (aiCatResult.rows.length === 0 || healthCatResult.rows.length === 0 || lawCatResult.rows.length === 0) return;

  const aiCatId = aiCatResult.rows[0].id as number;
  const healthCatId = healthCatResult.rows[0].id as number;
  const lawCatId = lawCatResult.rows[0].id as number;

  const courses = [
    {
      title: "AI创客工作坊 — 用AI工具开启副业",
      description: "本期工作坊将手把手教你使用最新的AI工具（ChatGPT、Midjourney、Cursor等），从零开始搭建属于你的AI副业。无论你是技术小白还是有一定基础，都能在这里找到属于你的AI创业方向。让我们一起用AI改变生活！",
      category_id: aiCatId,
      instructor: "陈工",
      start_time: "2026-05-10T14:00:00",
      location: "线下·上海",
      max_participants: 30,
    },
    {
      title: "自然养生·经络疏通入门",
      description: "经络是人体的能量通道，疏通经络是养生的基础。谢老师将从中医基础理论出发，带你认识十二正经和奇经八脉，学习简单实用的经络疏通手法，让你在家就能自我调理。适合零基础学员。",
      category_id: healthCatId,
      instructor: "谢老师",
      start_time: "2026-05-17T10:00:00",
      location: "线下·上海",
      max_participants: 20,
    },
    {
      title: "法律沙龙·财富传承规划",
      description: "财富传承不仅仅是遗嘱那么简单。刘律师将从法律、税务、家族信托等多个维度，系统讲解如何做好财富传承规划。无论你的资产规模大小，提前规划都能让你和家人更安心。本期特别适合40岁以上的朋友参加。",
      category_id: lawCatId,
      instructor: "刘律师",
      start_time: "2026-05-24T14:00:00",
      location: "线上",
      max_participants: 50,
    },
  ];

  const stmts = courses.map((c) => ({
    sql: `INSERT OR IGNORE INTO courses (title, description, category_id, instructor, start_time, location, max_participants)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [c.title, c.description, c.category_id, c.instructor, c.start_time, c.location, c.max_participants],
  }));

  await db.batch(stmts, "write");
}

export async function seedInviteCodes(): Promise<void> {
  await db.batch([
    {
      sql: `INSERT OR IGNORE INTO invite_codes (code, created_by, max_uses, note) VALUES (?, 1, 10, '初始通用邀请码')`,
      args: ["JSHU2026"],
    },
    {
      sql: `INSERT OR IGNORE INTO invite_codes (code, created_by, max_uses, note) VALUES (?, 1, 10, '欢迎码1')`,
      args: ["WELCOME1"],
    },
    {
      sql: `INSERT OR IGNORE INTO invite_codes (code, created_by, max_uses, note) VALUES (?, 1, 10, '欢迎码2')`,
      args: ["WELCOME2"],
    },
  ], "write");
}

export async function seedSiteSettings(): Promise<void> {
  const navMenu = JSON.stringify([
    { label: "首页", href: "/", visible: true },
    { label: "社群动态", href: "/community", visible: true },
    { label: "社群板块", href: "/categories", visible: true },
    { label: "课程报名", href: "/courses", visible: true },
    { label: "论坛公告", href: "/announcements", visible: true },
    { label: "活动档案", href: "/activities", visible: true },
    { label: "积分排行", href: "/leaderboard", visible: true },
    { label: "关于我们", href: "/about", visible: true },
  ]);

  const heroContent = JSON.stringify({
    site_name: "君说乎",
    subtitle: "数字家园",
    description: "这里是一群都市人的精神自留地。我们相信，真正的富足，不是物质的堆砌，而是灵魂的丰盈。",
    cta_text: "加入君说乎，遇见同频的灵魂",
    cta_button: "立即加入",
  });

  const aboutContent = JSON.stringify({
    title: "关于我们",
    intro: "学而时习之，不亦说乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？",
    mission: `君说乎之名，源自《论语》\u201c学而时习之，不亦说乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？\u201d。自诞生之初，社群便以\u201c学习是快乐的，相遇是幸运的，彼此理解是珍贵的\u201d为初心，致力于打破流量时代功利性社交的壁垒，打造一个无阶层、无壁垒、有温度、有价值的同频人成长共同体。\n\n社群以\u201c自立利他\u201d为灵魂，拒绝流量堆砌、摒弃短期变现逻辑，坚信真正的社群是灵魂的同频、双向的奔赴、长期的共生，最终目标是成为都市人可卸下铠甲、真实面对自我、精准链接同频者的\u201c精神家园\u201d。`,
    values: ["真诚链接", "同频成长", "双向奔赴", "价值共建"],
    history: `从最初一张咖啡桌旁十个人的小沙龙起步，君说乎已走过十年发展历程，累计举办近500场线上线下学习沙龙、课程与活动，覆盖法律、心理、教育、管理、健康、艺术、传统文化等多元领域，沉淀了一批有才华、有匠心的讲师团队，以及数千名热爱学习、认同社群理念的社群成员。\n\n十年间，社群经历了从初创到2019年三年的辉煌，也走过疫情期间的停摆与重启，始终坚守长期主义，完成了从\u201c单一活动社群\u201d到\u201c体系化成长生态\u201d的升级，形成了独特的社群文化——\u201c一群人学习一群人，一群人服务一群人，一群人帮助一群人。\u201d`,
    team: `社群核心用户为30-60岁群体，以70后、80后、90后为主体，包括创业者、自由职业者、企业中高管、公务员、教师等各界精英。区别于传统社群以\u201c知识输出\u201d为单一价值的模式，君说乎以\u201c情感链接＋确定性支持\u201d为核心价值，不仅解决用户的认知提升问题，更承接都市成年人的情绪内耗、孤独感、成长焦虑等底层需求，打造一个\u201c允许你不完美，只管真实\u201d的安全社交空间。`,
  });

  const footerContent = JSON.stringify({
    slogan: "都市人的精神自留地",
    values: ["真诚链接", "同频成长", "双向奔赴", "价值共建"],
    copyright: "© 2026 君说乎 · 数字家园。用温暖连接每一颗有趣的灵魂。",
    links: [
      { label: "社群板块", href: "/categories" },
      { label: "课程报名", href: "/courses" },
      { label: "关于我们", href: "/about" },
    ],
  });

  const contactInfo = JSON.stringify({
    wechat: "",
    email: "",
    phone: "",
    address: "",
    wechat_qrcode: "",
    custom_fields: [],
  });

  await db.batch([
    { sql: "INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)", args: ["nav_menu", navMenu] },
    { sql: "INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)", args: ["hero_content", heroContent] },
    { sql: "INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)", args: ["about_content", aboutContent] },
    { sql: "INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)", args: ["footer_content", footerContent] },
    { sql: "INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)", args: ["contact_info", contactInfo] },
  ], "write");
}

/**
 * Initialize the database: create tables, seed categories, admin, courses, invite codes & site settings.
 * Safe to call multiple times — all operations are idempotent.
 */
export async function initializeDatabase(): Promise<Client> {
  const database = await getDb();
  await seedCategories();
  await seedAdmin();
  await seedCourses();
  await seedInviteCodes();
  await seedSiteSettings();
  return database;
}
