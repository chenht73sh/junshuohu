"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Users,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Course {
  id: number;
  title: string;
  description: string | null;
  category_id: number;
  instructor: string;
  start_time: string | null;
  location: string | null;
  max_participants: number | null;
  current_participants: number;
  status: string;
  created_at: string;
  category_name: string;
  category_color: string;
}

function getStatusInfo(course: Course, isFull: boolean) {
  if (course.status === "closed" || course.status === "ended") {
    return { label: "已结束", className: "text-text-muted bg-border-light" };
  }
  if (isFull) {
    return { label: "已满", className: "text-error bg-error/10" };
  }
  return { label: "报名中", className: "text-success bg-success/10" };
}

export default function CoursesPage() {
  const { user, token } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<number | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  // Fetch enrolled courses for current user
  useEffect(() => {
    if (!user || !token || courses.length === 0) return;

    async function checkEnrollments() {
      const enrolled = new Set<number>();
      await Promise.all(
        courses.map(async (course) => {
          try {
            const res = await fetch(`/api/courses/${course.id}/enrollments`);
            const data = await res.json();
            if (
              data.enrollments?.some(
                (e: { user_id: number }) => e.user_id === user!.id
              )
            ) {
              enrolled.add(course.id);
            }
          } catch {
            // ignore
          }
        })
      );
      setEnrolledIds(enrolled);
    }

    checkEnrollments();
  }, [user, token, courses]);

  async function fetchCourses() {
    try {
      const res = await fetch("/api/courses");
      const data = await res.json();
      setCourses(data.courses || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleEnroll(courseId: number) {
    if (!token) {
      window.location.href = "/login";
      return;
    }

    setEnrollingId(courseId);
    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setEnrolledIds((prev) => new Set(prev).add(courseId));
        setCourses((prev) =>
          prev.map((c) =>
            c.id === courseId
              ? { ...c, current_participants: c.current_participants + 1 }
              : c
          )
        );
      } else {
        const data = await res.json();
        alert(data.error || "报名失败");
      }
    } catch {
      alert("网络错误，请稍后重试");
    } finally {
      setEnrollingId(null);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "待定";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("zh-CN", {
        month: "long",
        day: "numeric",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  }

  const openCourses = courses.filter((c) => c.status === "open");

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* Breadcrumb */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        返回首页
      </Link>

      {/* Title */}
      <div className="mb-10">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-3">
          📚 课程报名
        </h1>
        <p className="text-text-secondary text-lg">
          精选课程与活动，与同频的人一起成长
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="text-primary animate-spin" />
          <span className="ml-2 text-text-muted">加载中...</span>
        </div>
      ) : openCourses.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-text-muted text-lg mb-2">暂无开放课程</p>
          <p className="text-text-muted text-sm">请稍后再来看看 ✨</p>
        </div>
      ) : (
        <>
          {/* ===== Desktop Table ===== */}
          <div className="hidden md:block card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent-light/30">
                    <th className="text-left px-5 py-3.5 font-semibold text-text-primary whitespace-nowrap">
                      课程名称
                    </th>
                    <th className="text-left px-5 py-3.5 font-semibold text-text-primary whitespace-nowrap">
                      讲师
                    </th>
                    <th className="text-left px-5 py-3.5 font-semibold text-text-primary whitespace-nowrap">
                      <span className="inline-flex items-center gap-1"><Calendar size={13} /> 时间</span>
                    </th>
                    <th className="text-left px-5 py-3.5 font-semibold text-text-primary whitespace-nowrap">
                      <span className="inline-flex items-center gap-1"><MapPin size={13} /> 地点</span>
                    </th>
                    <th className="text-center px-5 py-3.5 font-semibold text-text-primary whitespace-nowrap">
                      <span className="inline-flex items-center gap-1"><Users size={13} /> 报名/限额</span>
                    </th>
                    <th className="text-center px-5 py-3.5 font-semibold text-text-primary whitespace-nowrap">
                      状态
                    </th>
                    <th className="text-center px-5 py-3.5 font-semibold text-text-primary whitespace-nowrap">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {openCourses.map((course) => {
                    const isFull =
                      course.max_participants !== null &&
                      course.current_participants >= course.max_participants;
                    const isEnrolled = enrolledIds.has(course.id);
                    const statusInfo = getStatusInfo(course, isFull);

                    return (
                      <tr
                        key={course.id}
                        className="hover:bg-accent-light/20 transition-colors"
                      >
                        {/* 课程名称 */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block w-1 h-8 rounded-full shrink-0"
                              style={{ backgroundColor: course.category_color || "#8B6F47" }}
                            />
                            <div className="min-w-0">
                              <Link
                                href={`/courses/${course.id}`}
                                className="font-medium text-text-primary hover:text-primary transition-colors line-clamp-1"
                              >
                                {course.title}
                              </Link>
                              <span
                                className="text-xs px-1.5 py-0.5 rounded mt-0.5 inline-block"
                                style={{
                                  color: course.category_color || "#8B6F47",
                                  backgroundColor: `${course.category_color || "#8B6F47"}15`,
                                }}
                              >
                                {course.category_name}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 讲师 */}
                        <td className="px-5 py-4 text-text-secondary whitespace-nowrap">
                          {course.instructor}
                        </td>

                        {/* 时间 */}
                        <td className="px-5 py-4 text-text-secondary whitespace-nowrap">
                          {formatDate(course.start_time)}
                        </td>

                        {/* 地点 */}
                        <td className="px-5 py-4 text-text-secondary max-w-[160px] truncate">
                          {course.location || "待定"}
                        </td>

                        {/* 报名/限额 */}
                        <td className="px-5 py-4 text-center whitespace-nowrap">
                          <span className="text-text-primary font-medium">
                            {course.current_participants}
                          </span>
                          <span className="text-text-muted">
                            {" / "}
                            {course.max_participants ?? "∞"}
                          </span>
                        </td>

                        {/* 状态 */}
                        <td className="px-5 py-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${statusInfo.className}`}
                          >
                            {statusInfo.label}
                          </span>
                        </td>

                        {/* 操作 */}
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              href={`/courses/${course.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
                            >
                              <Eye size={13} />
                              详情
                            </Link>
                            {isEnrolled ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-text-muted bg-border-light rounded-lg">
                                <CheckCircle size={13} />
                                已报名
                              </span>
                            ) : isFull ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-error/70 bg-error/5 border border-error/20 rounded-lg">
                                <XCircle size={13} />
                                已满
                              </span>
                            ) : (
                              <button
                                onClick={() => handleEnroll(course.id)}
                                disabled={enrollingId === course.id}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-text-inverse bg-success hover:bg-success/90 rounded-lg disabled:opacity-50 transition-colors"
                              >
                                {enrollingId === course.id ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <Users size={13} />
                                )}
                                {enrollingId === course.id ? "报名中..." : "报名"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ===== Mobile Cards ===== */}
          <div className="md:hidden grid gap-4">
            {openCourses.map((course) => {
              const isFull =
                course.max_participants !== null &&
                course.current_participants >= course.max_participants;
              const isEnrolled = enrolledIds.has(course.id);
              const statusInfo = getStatusInfo(course, isFull);

              return (
                <div
                  key={course.id}
                  className="card overflow-hidden"
                >
                  <div className="flex">
                    {/* Left color bar */}
                    <div
                      className="w-1.5 shrink-0"
                      style={{ backgroundColor: course.category_color || "#8B6F47" }}
                    />
                    <div className="flex-1 p-4">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/courses/${course.id}`}
                            className="font-serif text-base font-bold text-text-primary hover:text-primary transition-colors line-clamp-2"
                          >
                            {course.title}
                          </Link>
                        </div>
                        <span
                          className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${statusInfo.className}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>

                      {/* Info rows */}
                      <div className="space-y-1.5 text-sm text-text-muted mb-3">
                        <div className="flex items-center gap-1.5">
                          👨‍🏫 <span className="text-text-secondary">{course.instructor}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} />
                          <span>{formatDate(course.start_time)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin size={13} />
                          <span>{course.location || "待定"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users size={13} />
                          <span>
                            {course.current_participants} / {course.max_participants ?? "∞"} 人
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/courses/${course.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          <Eye size={13} />
                          详情
                        </Link>
                        {isEnrolled ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-text-muted bg-border-light rounded-lg">
                            <CheckCircle size={13} />
                            已报名
                          </span>
                        ) : isFull ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-error/70 bg-error/5 border border-error/20 rounded-lg">
                            <XCircle size={13} />
                            已满
                          </span>
                        ) : (
                          <button
                            onClick={() => handleEnroll(course.id)}
                            disabled={enrollingId === course.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-text-inverse bg-success hover:bg-success/90 rounded-lg disabled:opacity-50 transition-colors"
                          >
                            {enrollingId === course.id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Users size={13} />
                            )}
                            {enrollingId === course.id ? "报名中..." : "报名"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
