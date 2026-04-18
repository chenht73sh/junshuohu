/**
 * Standalone database initialization script.
 * Run with: npx tsx scripts/init-db.ts
 */
import { initializeDatabase } from "../src/lib/db";

async function main() {
  console.log("🏠 君说乎数字家园 — 数据库初始化");
  console.log("=".repeat(40));

  try {
    const db = await initializeDatabase();

    // Verify tables
    const tablesResult = await db.execute({
      sql: "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      args: [],
    });
    console.log("\n✅ 数据库表:");
    tablesResult.rows.forEach((t) => console.log(`   - ${t.name}`));

    // Verify categories
    const categoriesResult = await db.execute({
      sql: "SELECT id, name, moderator_name FROM categories ORDER BY sort_order",
      args: [],
    });
    console.log(`\n✅ 板块 (${categoriesResult.rows.length} 个):`);
    categoriesResult.rows.forEach((c) =>
      console.log(`   ${c.id}. ${c.name} — 主理人: ${c.moderator_name}`)
    );

    // Verify admin
    const adminResult = await db.execute({
      sql: "SELECT id, username, display_name, role FROM users WHERE username = 'admin'",
      args: [],
    });
    if (adminResult.rows.length > 0) {
      const admin = adminResult.rows[0];
      console.log(`\n✅ 管理员账号: ${admin.username} (${admin.display_name}), 角色: ${admin.role}`);
    } else {
      console.error("\n❌ 管理员账号创建失败!");
    }

    console.log("\n🎉 数据库初始化完成!");
  } catch (error) {
    console.error("❌ 数据库初始化失败:", error);
    process.exit(1);
  }
}

main();
