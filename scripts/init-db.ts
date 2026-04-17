/**
 * Standalone database initialization script.
 * Run with: npx tsx scripts/init-db.ts
 */
import { initializeDatabase, getDb } from "../src/lib/db";

console.log("🏠 君说乎数字家园 — 数据库初始化");
console.log("=".repeat(40));

try {
  const db = initializeDatabase();

  // Verify tables
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all() as { name: string }[];
  console.log("\n✅ 数据库表:");
  tables.forEach((t) => console.log(`   - ${t.name}`));

  // Verify categories
  const categories = db
    .prepare("SELECT id, name, moderator_name FROM categories ORDER BY sort_order")
    .all() as { id: number; name: string; moderator_name: string }[];
  console.log(`\n✅ 板块 (${categories.length} 个):`);
  categories.forEach((c) => console.log(`   ${c.id}. ${c.name} — 主理人: ${c.moderator_name}`));

  // Verify admin
  const admin = db
    .prepare("SELECT id, username, display_name, role FROM users WHERE username = 'admin'")
    .get() as { id: number; username: string; display_name: string; role: string } | undefined;
  if (admin) {
    console.log(`\n✅ 管理员账号: ${admin.username} (${admin.display_name}), 角色: ${admin.role}`);
  } else {
    console.error("\n❌ 管理员账号创建失败!");
  }

  console.log("\n🎉 数据库初始化完成!");
  console.log(`   路径: data/junshuohu.db`);
} catch (error) {
  console.error("❌ 数据库初始化失败:", error);
  process.exit(1);
}
