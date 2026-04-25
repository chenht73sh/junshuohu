"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  authorId: number;
}

export default function SendMessageButton({ authorId }: Props) {
  const { user } = useAuth();

  // Don't show if not logged in, or if viewing own post
  if (!user || user.id === authorId) return null;

  return (
    <Link
      href={`/messages/${authorId}`}
      className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 text-[11px] font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-colors"
    >
      <Mail size={11} />
      发私信
    </Link>
  );
}
