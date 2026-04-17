import Database from "better-sqlite3";
import path from "path";
import bcryptjs from "bcryptjs";

const DB_PATH = path.join(process.cwd(), "data", "junshuohu.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  // Ensure data directory exists
  const fs = require("fs");
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent read performance
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Initialize tables
  initTables(db);

  // Run migrations for existing databases
  migrateDatabase(db);

  return db;
}

function initTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin', 'moderator', 'member')),
      bio TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      moderator_name TEXT,
      icon TEXT,
      color TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS posts (
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
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      author_id INTEGER NOT NULL,
      post_id INTEGER NOT NULL,
      parent_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (author_id) REFERENCES users(id),
      FOREIGN KEY (post_id) REFERENCES posts(id),
      FOREIGN KEY (parent_id) REFERENCES comments(id)
    );

    CREATE TABLE IF NOT EXISTS courses (
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
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (course_id) REFERENCES courses(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(course_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS post_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES posts(id)
    );

    CREATE TABLE IF NOT EXISTS post_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_type TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES posts(id)
    );

    CREATE TABLE IF NOT EXISTS announcements (
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
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id);
    CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
    CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
    CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
    CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category_id);
    CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
    CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
    CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
    CREATE INDEX IF NOT EXISTS idx_post_images_post ON post_images(post_id);
    CREATE INDEX IF NOT EXISTS idx_post_attachments_post ON post_attachments(post_id);
    CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON announcements(is_pinned DESC, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_announcements_author ON announcements(author_id);
  `);
}

function migrateDatabase(db: Database.Database): void {
  // Add video_url column to posts if missing
  const columns = db.prepare("PRAGMA table_info(posts)").all() as { name: string }[];
  const hasVideoUrl = columns.some((col) => col.name === "video_url");
  if (!hasVideoUrl) {
    db.exec("ALTER TABLE posts ADD COLUMN video_url TEXT");
  }
}

export function seedCategories(db: Database.Database): void {
  const count = db.prepare("SELECT COUNT(*) as cnt FROM categories").get() as { cnt: number };
  if (count.cnt > 0) return; // Already seeded

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

  const stmt = db.prepare(`
    INSERT INTO categories (name, moderator_name, description, icon, color, sort_order)
    VALUES (@name, @moderator_name, @description, @icon, @color, @sort_order)
  `);

  const insertAll = db.transaction(() => {
    for (const cat of categories) {
      stmt.run(cat);
    }
  });

  insertAll();
}

export function seedAdmin(db: Database.Database): void {
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get("admin");
  if (existing) return; // Already exists

  const passwordHash = bcryptjs.hashSync("junshuohu2026", 10);

  db.prepare(`
    INSERT INTO users (username, email, password_hash, display_name, role, bio)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run("admin", "admin@junshuohu.com", passwordHash, "管理员", "admin", "君说乎数字家园管理员");
}

export function seedCourses(db: Database.Database): void {
  const count = db.prepare("SELECT COUNT(*) as cnt FROM courses").get() as { cnt: number };
  if (count.cnt > 0) return; // Already seeded

  // Get category IDs for mapping
  const aiCat = db.prepare("SELECT id FROM categories WHERE name = ?").get("AI应用交流") as { id: number } | undefined;
  const healthCat = db.prepare("SELECT id FROM categories WHERE name = ?").get("健康养生") as { id: number } | undefined;
  const lawCat = db.prepare("SELECT id FROM categories WHERE name = ?").get("微普法") as { id: number } | undefined;

  if (!aiCat || !healthCat || !lawCat) return; // Categories not seeded yet

  const courses = [
    {
      title: "AI创客工作坊 — 用AI工具开启副业",
      description: "本期工作坊将手把手教你使用最新的AI工具（ChatGPT、Midjourney、Cursor等），从零开始搭建属于你的AI副业。无论你是技术小白还是有一定基础，都能在这里找到属于你的AI创业方向。让我们一起用AI改变生活！",
      category_id: aiCat.id,
      instructor: "陈工",
      start_time: "2026-05-10T14:00:00",
      location: "线下·上海",
      max_participants: 30,
    },
    {
      title: "自然养生·经络疏通入门",
      description: "经络是人体的能量通道，疏通经络是养生的基础。谢老师将从中医基础理论出发，带你认识十二正经和奇经八脉，学习简单实用的经络疏通手法，让你在家就能自我调理。适合零基础学员。",
      category_id: healthCat.id,
      instructor: "谢老师",
      start_time: "2026-05-17T10:00:00",
      location: "线下·上海",
      max_participants: 20,
    },
    {
      title: "法律沙龙·财富传承规划",
      description: "财富传承不仅仅是遗嘱那么简单。刘律师将从法律、税务、家族信托等多个维度，系统讲解如何做好财富传承规划。无论你的资产规模大小，提前规划都能让你和家人更安心。本期特别适合40岁以上的朋友参加。",
      category_id: lawCat.id,
      instructor: "刘律师",
      start_time: "2026-05-24T14:00:00",
      location: "线上",
      max_participants: 50,
    },
  ];

  const stmt = db.prepare(`
    INSERT INTO courses (title, description, category_id, instructor, start_time, location, max_participants)
    VALUES (@title, @description, @category_id, @instructor, @start_time, @location, @max_participants)
  `);

  const insertAll = db.transaction(() => {
    for (const course of courses) {
      stmt.run(course);
    }
  });

  insertAll();
}

/**
 * Initialize the database: create tables, seed categories, admin & courses.
 * Safe to call multiple times — all operations are idempotent.
 */
export function initializeDatabase(): Database.Database {
  const database = getDb();
  seedCategories(database);
  seedAdmin(database);
  seedCourses(database);
  return database;
}
