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
    const db = initializeDatabase();

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

    const result = db
      .prepare(`UPDATE courses SET ${updates.join(", ")} WHERE id = ?`)
      .run(...values);

    if (result.changes === 0) {
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

    const db = initializeDatabase();

    const deleteAll = db.transaction(() => {
      db.prepare("DELETE FROM enrollments WHERE course_id = ?").run(courseId);
      return db.prepare("DELETE FROM courses WHERE id = ?").run(courseId);
    });

    const result = deleteAll();

    if (result.changes === 0) {
      return NextResponse.json({ error: "课程不存在" }, { status: 404 });
    }

    return NextResponse.json({ message: "课程已删除" });
  } catch (error) {
    console.error("Failed to delete course:", error);
    return NextResponse.json({ error: "删除课程失败" }, { status: 500 });
  }
}
