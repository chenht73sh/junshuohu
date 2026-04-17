"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
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

interface Enrollment {
  id: number;
  created_at: string;
  user_id: number;
  display_name: string;
  avatar_url: string | null;
}

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.id as string;
  const { user, token } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [courseRes, enrollRes] = await Promise.all([
          fetch(`/api/courses/${courseId}`),
          fetch(`/api/courses/${courseId}/enrollments`),
        ]);

        const courseData = await courseRes.json();
        const enrollData = await enrollRes.json();

        if (courseData.course) setCourse(courseData.course);
        if (enrollData.enrollments) setEnrollments(enrollData.enrollments);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [courseId]);

  // Check if user is enrolled
  useEffect(() => {
    if (user && enrollments.length > 0) {
      setIsEnrolled(enrollments.some((e) => e.user_id === user.id));
    }
  }, [user, enrollments]);

  // Countdown timer
  useEffect(() => {
    if (!course?.start_time) return;

    function updateCountdown() {
      const now = new Date().getTime();
      const target = new Date(course!.start_time!).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setCountdown("已开始");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setCountdown(`${days}天${hours}小时后开始`);
      } else if (hours > 0) {
        setCountdown(`${hours}小时${minutes}分钟后开始`);
      } else {
        setCountdown(`${minutes}分钟后开始`);
      }
    }

    updateCountdown();
    const timer = setInterval(updateCountdown, 60000);
    return () => clearInterval(timer);
  }, [course]);

  async function handleEnroll() {
    if (!token) {
      window.location.href = "/login";
      return;
    }

    setEnrolling(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setIsEnrolled(true);
        setCourse((prev) =>
          prev
            ? { ...prev, current_participants: prev.current_participants + 1 }
            : prev
        );
        // Refresh enrollments
        const enrollRes = await fetch(`/api/courses/${courseId}/enrollments`);
        const enrollData = await enrollRes.json();
        if (enrollData.enrollments) setEnrollments(enrollData.enrollments);
      } else {
        const data = await res.json();
        alert(data.error || "报名失败");
      }
    } catch {
      alert("网络错误，请稍后重试");
    } finally {
      setEnrolling(false);
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

  function formatEnrollDate(dateStr: string) {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("zh-CN", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="text-primary animate-spin" />
        <span className="ml-2 text-text-muted">加载中...</span>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
        <p className="text-xl text-text-muted mb-4">课程不存在</p>
        <Link href="/courses" className="text-primary hover:text-primary-dark">
          返回课程列表
        </Link>
      </div>
    );
  }

  const isFull =
    course.max_participants !== null &&
    course.current_participants >= course.max_participants;
  const progress = course.max_participants
    ? (course.current_participants / course.max_participants) * 100
    : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* Breadcrumb */}
      <Link
        href="/courses"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        返回课程列表
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Course header card */}
          <div className="card overflow-hidden">
            <div
              className="h-2"
              style={{
                backgroundColor: course.category_color || "#8B6F47",
              }}
            />
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="px-2.5 py-0.5 text-xs rounded-md font-medium"
                  style={{
                    color: course.category_color || "#8B6F47",
                    backgroundColor: `${course.category_color || "#8B6F47"}15`,
                  }}
                >
                  {course.category_name}
                </span>
                {course.status === "open" && (
                  <span className="px-2.5 py-0.5 text-xs rounded-md font-medium text-success bg-success/10">
                    报名中
                  </span>
                )}
              </div>

              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-text-primary mb-4">
                {course.title}
              </h1>

              {course.description && (
                <p className="text-text-secondary leading-relaxed mb-6 prose-warm">
                  {course.description}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-bg rounded-lg">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-base">👨‍🏫</span>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">讲师</p>
                    <p className="text-sm font-medium text-text-primary">
                      {course.instructor}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-bg rounded-lg">
                  <div className="w-9 h-9 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                    <Calendar size={16} className="text-info" />
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">时间</p>
                    <p className="text-sm font-medium text-text-primary">
                      {formatDate(course.start_time)}
                    </p>
                  </div>
                </div>

                {course.location && (
                  <div className="flex items-center gap-3 p-3 bg-bg rounded-lg">
                    <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                      <MapPin size={16} className="text-warning" />
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">地点</p>
                      <p className="text-sm font-medium text-text-primary">
                        {course.location}
                      </p>
                    </div>
                  </div>
                )}

                {countdown && (
                  <div className="flex items-center gap-3 p-3 bg-bg rounded-lg">
                    <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                      <Clock size={16} className="text-success" />
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">倒计时</p>
                      <p className="text-sm font-medium text-text-primary">
                        {countdown}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Enrollment list */}
          <div className="card p-6 sm:p-8">
            <h2 className="font-serif text-lg font-bold mb-4 flex items-center gap-2">
              <Users size={18} className="text-primary" />
              报名名单（{enrollments.length}人）
            </h2>

            {enrollments.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {enrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="flex items-center gap-2.5 p-2.5 bg-bg rounded-lg"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-medium text-primary">
                        {enrollment.display_name.charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {enrollment.display_name}
                      </p>
                      <p className="text-xs text-text-muted">
                        {formatEnrollDate(enrollment.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted text-center py-6">
                还没有人报名，成为第一个吧 🌟
              </p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
            {/* Progress */}
            {course.max_participants && (
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-text-muted">报名人数</span>
                  <span className="font-medium text-text-primary">
                    {course.current_participants} / {course.max_participants}
                  </span>
                </div>
                <div className="w-full h-3 bg-border-light rounded-full overflow-hidden">
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
                <p className="text-xs text-text-muted mt-1.5 text-right">
                  {isFull
                    ? "已满员"
                    : `还剩 ${course.max_participants - course.current_participants} 个名额`}
                </p>
              </div>
            )}

            {/* Enroll button */}
            {isEnrolled ? (
              <button
                disabled
                className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-text-muted bg-border-light rounded-lg cursor-default"
              >
                <CheckCircle size={18} />
                已报名 ✓
              </button>
            ) : isFull ? (
              <button
                disabled
                className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-error/70 bg-error/5 border border-error/20 rounded-lg cursor-not-allowed"
              >
                <XCircle size={18} />
                已满员
              </button>
            ) : (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-text-inverse bg-success hover:bg-success/90 rounded-lg disabled:opacity-50 transition-colors"
              >
                {enrolling ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Users size={18} />
                )}
                {enrolling ? "报名中..." : "我要报名"}
              </button>
            )}

            {!user && !isEnrolled && !isFull && (
              <p className="text-xs text-text-muted text-center mt-3">
                报名需要先{" "}
                <Link
                  href="/login"
                  className="text-primary hover:text-primary-dark"
                >
                  登录
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
