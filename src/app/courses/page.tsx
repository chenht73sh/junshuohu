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
        year: "numeric",
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
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
        <div className="grid gap-6">
          {openCourses.map((course) => {
            const isFull =
              course.max_participants !== null &&
              course.current_participants >= course.max_participants;
            const isEnrolled = enrolledIds.has(course.id);
            const progress =
              course.max_participants
                ? (course.current_participants / course.max_participants) * 100
                : 0;

            return (
              <div
                key={course.id}
                className="card overflow-hidden hover:shadow-card-hover"
              >
                <div className="flex">
                  {/* Left color bar */}
                  <div
                    className="w-1.5 sm:w-2 shrink-0"
                    style={{
                      backgroundColor: course.category_color || "#8B6F47",
                    }}
                  />

                  <div className="flex-1 p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      {/* Course info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="px-2 py-0.5 text-xs rounded-md font-medium"
                            style={{
                              color: course.category_color || "#8B6F47",
                              backgroundColor: `${course.category_color || "#8B6F47"}15`,
                            }}
                          >
                            {course.category_name}
                          </span>
                        </div>

                        <Link href={`/courses/${course.id}`}>
                          <h2 className="font-serif text-xl font-bold text-text-primary hover:text-primary transition-colors mb-2">
                            {course.title}
                          </h2>
                        </Link>

                        {course.description && (
                          <p className="text-sm text-text-secondary mb-3 line-clamp-2">
                            {course.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-muted">
                          <span className="flex items-center gap-1.5">
                            👨‍🏫 {course.instructor}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar size={14} />
                            {formatDate(course.start_time)}
                          </span>
                          {course.location && (
                            <span className="flex items-center gap-1.5">
                              <MapPin size={14} />
                              {course.location}
                            </span>
                          )}
                        </div>

                        {/* Progress bar */}
                        {course.max_participants && (
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-xs text-text-muted mb-1.5">
                              <span className="flex items-center gap-1">
                                <Users size={12} />
                                报名进度
                              </span>
                              <span>
                                {course.current_participants} / {course.max_participants} 人
                              </span>
                            </div>
                            <div className="w-full h-2 bg-border-light rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(progress, 100)}%`,
                                  backgroundColor: isFull
                                    ? "var(--color-error)"
                                    : progress > 80
                                      ? "var(--color-warning)"
                                      : "var(--color-success)",
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Enroll button */}
                      <div className="sm:ml-4 shrink-0">
                        {isEnrolled ? (
                          <button
                            disabled
                            className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-text-muted bg-border-light rounded-lg cursor-default"
                          >
                            <CheckCircle size={16} />
                            已报名 ✓
                          </button>
                        ) : isFull ? (
                          <button
                            disabled
                            className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-error/70 bg-error/5 border border-error/20 rounded-lg cursor-not-allowed"
                          >
                            <XCircle size={16} />
                            已满员
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEnroll(course.id)}
                            disabled={enrollingId === course.id}
                            className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-text-inverse bg-success hover:bg-success/90 rounded-lg disabled:opacity-50 transition-colors"
                          >
                            {enrollingId === course.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Users size={16} />
                            )}
                            {enrollingId === course.id
                              ? "报名中..."
                              : "我要报名"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
