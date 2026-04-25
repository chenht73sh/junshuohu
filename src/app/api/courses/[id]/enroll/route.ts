import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface CourseRow {
  id: number;
  title: string;
  max_participants: number | null;
  current_participants: number;
  status: string;
}

interface CardRow {
  id: number;
  user_id: number;
  remaining_sessions: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const courseId = parseInt(id, 10);
    if (isNaN(courseId)) {
      return NextResponse.json({ error: "无效的课程ID" }, { status: 400 });
    }

    // Verify auth
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "登录已过期，请重新登录" },
        { status: 401 }
      );
    }

    // Parse body
    let paymentType: string = "次卡";
    let guestCount: number = 0;
    let cardId: number | null = null;

    try {
      const body = await request.json();
      paymentType = body.paymentType || "次卡";
      guestCount = parseInt(body.guestCount || "0", 10) || 0;
      cardId = body.cardId ? parseInt(body.cardId, 10) : null;
    } catch {
      // No body / empty body is okay — defaults apply
    }

    if (guestCount < 0 || guestCount > 5) {
      return NextResponse.json({ error: "带人数量需在0-5之间" }, { status: 400 });
    }

    const db = await initializeDatabase();

    // Check course exists and is open
    const courseResult = await db.execute({
      sql: "SELECT id, title, max_participants, current_participants, status FROM courses WHERE id = ?",
      args: [courseId],
    });

    if (courseResult.rows.length === 0) {
      return NextResponse.json({ error: "课程不存在" }, { status: 404 });
    }

    const course = courseResult.rows[0] as unknown as CourseRow;

    if (course.status !== "open") {
      return NextResponse.json({ error: "课程报名已关闭" }, { status: 400 });
    }

    // Check if already enrolled
    const existingResult = await db.execute({
      sql: "SELECT id FROM enrollments WHERE course_id = ? AND user_id = ?",
      args: [courseId, payload.userId],
    });

    if (existingResult.rows.length > 0) {
      return NextResponse.json({ error: "您已报名该课程" }, { status: 409 });
    }

    // Check capacity
    if (
      course.max_participants !== null &&
      course.current_participants >= course.max_participants
    ) {
      return NextResponse.json({ error: "课程已满员" }, { status: 400 });
    }

    if (paymentType === "次卡") {
      // Card payment flow
      if (!cardId) {
        return NextResponse.json({ error: "请选择要使用的次卡" }, { status: 400 });
      }

      // Verify card belongs to user
      const cardResult = await db.execute({
        sql: "SELECT id, user_id, remaining_sessions FROM member_cards WHERE id = ? AND user_id = ?",
        args: [cardId, payload.userId],
      });

      if (cardResult.rows.length === 0) {
        return NextResponse.json({ error: "次卡不存在或不属于当前用户" }, { status: 403 });
      }

      const card = cardResult.rows[0] as unknown as CardRow;
      const sessionsNeeded = 1 + guestCount;

      if (card.remaining_sessions < sessionsNeeded) {
        return NextResponse.json(
          {
            error: `次卡余额不足，当前剩余 ${card.remaining_sessions} 次，本次需要 ${sessionsNeeded} 次（含带人 ${guestCount} 次）`,
          },
          { status: 400 }
        );
      }

      // Atomic deduction: only succeeds if remaining_sessions >= sessionsNeeded
      const deductResult = await db.execute({
        sql: `UPDATE member_cards SET remaining_sessions = remaining_sessions - ?
              WHERE id = ? AND remaining_sessions >= ?`,
        args: [sessionsNeeded, cardId, sessionsNeeded],
      });

      if (deductResult.rowsAffected === 0) {
        return NextResponse.json({ error: "次卡余额不足（并发冲突），请重试" }, { status: 409 });
      }

      // Insert card transaction
      const txResult = await db.execute({
        sql: `INSERT INTO card_transactions
              (card_id, user_id, course_id, sessions_deducted, guest_count, transaction_type, notes)
              VALUES (?, ?, ?, ?, ?, '课程报名', ?)`,
        args: [
          cardId,
          payload.userId,
          courseId,
          sessionsNeeded,
          guestCount,
          guestCount > 0
            ? `报名「${course.title}」，带人 ${guestCount} 位`
            : `报名「${course.title}」`,
        ],
      });

      const txId = Number(txResult.lastInsertRowid);

      // Insert enrollment and update count
      await db.batch([
        {
          sql: `INSERT INTO enrollments (course_id, user_id, payment_type, guest_count, card_transaction_id)
                VALUES (?, ?, '次卡', ?, ?)`,
          args: [courseId, payload.userId, guestCount, txId],
        },
        {
          sql: "UPDATE courses SET current_participants = current_participants + 1 WHERE id = ?",
          args: [courseId],
        },
      ], "write");

    } else {
      // Single purchase flow
      await db.batch([
        {
          sql: `INSERT INTO enrollments (course_id, user_id, payment_type, single_price, guest_count)
                VALUES (?, ?, '单次', 58, ?)`,
          args: [courseId, payload.userId, guestCount],
        },
        {
          sql: "UPDATE courses SET current_participants = current_participants + 1 WHERE id = ?",
          args: [courseId],
        },
      ], "write");
    }

    return NextResponse.json(
      { message: `成功报名「${course.title}」`, enrolled: true },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to enroll:", error);
    return NextResponse.json(
      { error: "报名失败，请稍后重试" },
      { status: 500 }
    );
  }
}
