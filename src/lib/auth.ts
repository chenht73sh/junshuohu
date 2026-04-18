import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import { getDb } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "junshuohu-dev-secret-change-in-production";
const TOKEN_EXPIRES_IN = "7d";

export interface JwtPayload {
  userId: number;
  username: string;
  role: string;
}

export interface UserRow {
  id: number;
  username: string;
  email: string | null;
  password_hash: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
  bio: string | null;
  created_at: string;
}

/**
 * Authenticate user by username/password.
 * Returns the user row (without password_hash) or null.
 */
export async function authenticateUser(
  username: string,
  password: string
): Promise<Omit<UserRow, "password_hash"> | null> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM users WHERE username = ?",
    args: [username],
  });

  if (result.rows.length === 0) return null;
  const user = result.rows[0] as unknown as UserRow;
  if (!bcryptjs.compareSync(password, user.password_hash)) return null;

  const { password_hash: _, ...safeUser } = user;
  return safeUser;
}

/**
 * Generate a JWT token for the given user.
 */
export function generateToken(user: { id: number; username: string; role: string }): string {
  return jwt.sign(
    { userId: user.id, username: user.username, role: user.role } satisfies JwtPayload,
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN }
  );
}

/**
 * Verify and decode a JWT token.
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Hash a password with bcrypt.
 */
export function hashPassword(password: string): string {
  return bcryptjs.hashSync(password, 10);
}

// ─── Request-level auth helpers for API routes ───

import { NextRequest, NextResponse } from "next/server";

/**
 * Extract and verify JWT from Authorization header.
 * Returns the decoded payload or a NextResponse error.
 */
export function requireAuth(
  request: NextRequest
): JwtPayload | NextResponse {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "登录已过期" }, { status: 401 });
  }
  return payload;
}

/**
 * Require admin role.
 */
export function requireAdmin(
  request: NextRequest
): JwtPayload | NextResponse {
  const result = requireAuth(request);
  if (result instanceof NextResponse) return result;
  if (result.role !== "admin") {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }
  return result;
}

/**
 * Require admin or moderator role.
 */
export function requireModerator(
  request: NextRequest
): JwtPayload | NextResponse {
  const result = requireAuth(request);
  if (result instanceof NextResponse) return result;
  if (result.role !== "admin" && result.role !== "moderator") {
    return NextResponse.json({ error: "需要管理员或版主权限" }, { status: 403 });
  }
  return result;
}
