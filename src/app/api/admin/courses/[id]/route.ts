import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { requireModerator } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireModerator(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const courseId = parseInt(id, 10);
    if (isNaN(courseId)) {
      return NextResponse.json({ error: "无效的课程ID" }, { status: 400 });
    }

    const body = await request.json();
    const db = await initializeDatabase();

    const updates: string[] = [];
    const values: unknown[] = [];

    if (typeof body.title === "string" && body.title.trim()) {
      updates.push("title = ?");
      values.push(body.title.trim());
    }
    if (typeof body.description === "string") {
      updates.push("description = ?");
      values.push(body.description.trim());
    }
    if (typeof body.instructor === "string" && body.instructor.trim()) {
      updates.push("instructor = ?");
      values.push(body.instructor.trim());
    }
    if (typeof body.start_time === "string") {
      updates.push("start_time = ?");
      values.push(body.start_time);
    }
    if (typeof body.location === "string") {
      updates.push("location = ?");
      values.push(body.location.trim());
    }
    if (typeof body.max_participants === "number") {
      updates.push("max_participants = ?");
      values.push(body.max_participants);
    }
    if (typeof body.status === "string" && ["open", "closed", "completed"].includes(body.status)) {
      updates.push("status = ?");
      values.push(body.status);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "没有需要更新的字段" }, { status: 400 });
    }

    values.push(courseId);

    const result = await db.execute({
      sql: `UPDATE courses SET ${updates.join(", ")} WHERE id = ?`,
      args: values as (string | number | null)[],
    });

    if (result.rowsAffected === 0) {
      return NextResponse.json({ error: "课程不存在" }, { status: 404 });
    }

    return NextResponse.json({ message: "课程已更新" });
  } catch (error) {
    console.error("Failed to update course:", error);
    return NextResponse.json({ error: "更新课程失败" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireModerator(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const courseId = parseInt(id, 10);
    if (isNaN(courseId)) {
      return NextResponse.json({ error: "无效的课程ID" }, { status: 400 });
    }

    const db = await initializeDatabase();

    await db.batch([
      { sql: "DELETE FROM enrollments WHERE course_id = ?", args: [courseId] },
      { sql: "DELETE FROM courses WHERE id = ?", args: [courseId] },
    ], "write");

    return NextResponse.json({ message: "课程已删除" });
  } catch (error) {
    console.error("Failed to delete course:", error);
    return NextResponse.json({ error: "删除课程失败" }, { status: 500 });
  }
}
