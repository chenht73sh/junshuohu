import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-surface border-t border-border mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        {/* Top section */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <span className="text-2xl">📖</span>
            <span className="font-serif text-xl font-semibold text-primary">
              君说乎
            </span>
          </Link>
          <p className="text-text-secondary text-sm">
            都市人的精神自留地
          </p>
        </div>

        {/* Core values */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          {["真诚链接", "同频成长", "双向奔赴", "价值共建"].map((value) => (
            <span
              key={value}
              className="px-4 py-1.5 text-sm text-text-secondary bg-accent-light/50 rounded-full"
            >
              {value}
            </span>
          ))}
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 mb-8 text-sm text-text-muted">
          <Link href="/community" className="hover:text-primary transition-colors">
            社群板块
          </Link>
          <Link href="/courses" className="hover:text-primary transition-colors">
            课程报名
          </Link>
          <Link href="/about" className="hover:text-primary transition-colors">
            关于我们
          </Link>
        </div>

        {/* Copyright */}
        <div className="text-center text-xs text-text-muted pt-6 border-t border-border-light">
          © 2026 君说乎 · 数字家园。用温暖连接每一颗有趣的灵魂。
        </div>
      </div>
    </footer>
  );
}
