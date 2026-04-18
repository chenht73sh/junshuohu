import { initializeDatabase } from "./db";

/**
 * Add points to a user and record the transaction.
 * Idempotent-safe: always creates a new record (not deduped by action).
 */
export async function addPoints(
  userId: number,
  points: number,
  action: string,
  description?: string,
  referenceId?: number,
  referenceType?: string
): Promise<void> {
  try {
    const db = await initializeDatabase();
    await db.batch([
      {
        sql: `INSERT INTO point_records (user_id, points, action, description, reference_id, reference_type)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [userId, points, action, description ?? null, referenceId ?? null, referenceType ?? null],
      },
      {
        sql: `UPDATE users SET total_points = COALESCE(total_points, 0) + ? WHERE id = ?`,
        args: [points, userId],
      },
    ], "write");
  } catch (err) {
    // Non-fatal: log but don't throw — we never want points to break the main action
    console.error("[addPoints] failed:", err);
  }
}
