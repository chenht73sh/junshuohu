"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type Status = "loading" | "success" | "already" | "not_enrolled" | "not_logged_in" | "error";

export default function CourseCheckinPage() {
  const { id } = useParams<{ id: string }>();
  const courseId = parseInt(id, 10);
  const router = useRouter();
  const { token } = useAuth();

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [checkedInAt, setCheckedInAt] = useState("");

  useEffect(() => {
    async function doCheckin() {
      if (!token) {
        setStatus("not_logged_in");
        return;
      }

      try {
        const res = await fetch(`/api/courses/${courseId}/qr-checkin`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (!res.ok) {
          if (data.code === "NOT_LOGGED_IN" || data.code === "TOKEN_EXPIRED") {
            setStatus("not_logged_in");
          } else if (data.code === "NOT_ENROLLED") {
            setStatus("not_enrolled");
            setMessage(data.error || "您未报名此课程");
          } else {
            setStatus("error");
            setMessage(data.error || "签到失败");
          }
          return;
        }

        if (data.code === "ALREADY_CHECKED_IN") {
          setStatus("already");
          setCourseTitle(data.courseTitle || "");
          setCheckedInAt(data.checkedInAt || "");
        } else if (data.code === "CHECKED_IN") {
          setStatus("success");
          setCourseTitle(data.courseTitle || "");
          setCheckedInAt(data.checkedInAt || "");
        } else {
          setStatus("error");
          setMessage("未知状态");
        }
      } catch {
        setStatus("error");
        setMessage("网络错误，请检查连接后重试");
      }
    }

    doCheckin();
  }, [token, courseId]);

  function formatTime(t: string) {
    if (!t) return "";
    try {
      return new Date(t).toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return t;
    }
  }

  function goLogin() {
    router.push(`/login?redirect=/courses/${courseId}/checkin`);
  }

  return (
    <div className="min-h-screen bg-[#FFFEF9] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-white border border-[#E8D8C4] rounded-2xl shadow-lg overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-[#C4955A] to-[#E8B87D]" />

          <div className="p-8 text-center space-y-5">
            {status === "loading" && (
              <>
                <Loader2 size={48} className="animate-spin text-amber-400 mx-auto" />
                <p className="text-[#6B4F3A] font-medium">正在签到，请稍候…</p>
              </>
            )}

            {status === "success" && (
              <>
                <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={44} className="text-green-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#4A3728] font-serif">签到成功！</h2>
                  {courseTitle && (
                    <p className="text-sm text-[#8B6E52] mt-2">
                      {courseTitle}
                    </p>
                  )}
                  {checkedInAt && (
                    <p className="text-xs text-[#A69882] mt-1.5">
                      签到时间：{formatTime(checkedInAt)}
                    </p>
                  )}
                </div>
                <p className="text-sm text-[#8B6E52]">
                  欢迎参加活动，祝您学有所获 ✨
                </p>
              </>
            )}

            {status === "already" && (
              <>
                <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={44} className="text-amber-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#4A3728] font-serif">已签到</h2>
                  {courseTitle && (
                    <p className="text-sm text-[#8B6E52] mt-2">{courseTitle}</p>
                  )}
                  {checkedInAt && (
                    <p className="text-xs text-[#A69882] mt-1.5">
                      签到时间：{formatTime(checkedInAt)}
                    </p>
                  )}
                </div>
                <p className="text-sm text-[#8B6E52]">您已签到，无需重复操作</p>
              </>
            )}

            {status === "not_logged_in" && (
              <>
                <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
                  <LogIn size={36} className="text-amber-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#4A3728] font-serif">请先登录</h2>
                  <p className="text-sm text-[#8B6E52] mt-2">
                    登录后即可完成签到
                  </p>
                </div>
                <button
                  onClick={goLogin}
                  className="w-full py-3 text-sm font-medium bg-[#C4955A] text-white rounded-xl hover:bg-[#B8844A] transition-colors"
                >
                  前往登录
                </button>
              </>
            )}

            {status === "not_enrolled" && (
              <>
                <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                  <XCircle size={44} className="text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#4A3728] font-serif">未报名此课程</h2>
                  <p className="text-sm text-[#8B6E52] mt-2">
                    {message || "请先报名后再扫码签到"}
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/courses/${courseId}`)}
                  className="w-full py-3 text-sm font-medium border border-[#C4955A] text-[#C4955A] rounded-xl hover:bg-amber-50 transition-colors"
                >
                  去报名
                </button>
              </>
            )}

            {status === "error" && (
              <>
                <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                  <XCircle size={44} className="text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#4A3728] font-serif">签到失败</h2>
                  <p className="text-sm text-[#8B6E52] mt-2">{message || "请稍后重试"}</p>
                </div>
              </>
            )}
          </div>

          {/* Bottom brand */}
          <div className="px-6 pb-5 text-center">
            <p className="text-xs text-[#C4A882]">君说乎 · 数字家园</p>
          </div>
        </div>
      </div>
    </div>
  );
}
