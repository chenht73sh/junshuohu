"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";

interface AboutContent {
  title: string;
  intro: string;
  mission: string;
  values: string[];
  history: string;
  team: string;
}

const defaultAbout: AboutContent = {
  title: "关于我们",
  intro: "学而时习之，不亦说乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？",
  mission:
    `君说乎之名，源自《论语》\u201c学而时习之，不亦说乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？\u201d。自诞生之初，社群便以\u201c学习是快乐的，相遇是幸运的，彼此理解是珍贵的\u201d为初心，致力于打破流量时代功利性社交的壁垒，打造一个无阶层、无壁垒、有温度、有价值的同频人成长共同体。\n\n社群以\u201c自立利他\u201d为灵魂，拒绝流量堆砌、摒弃短期变现逻辑，坚信真正的社群是灵魂的同频、双向的奔赴、长期的共生，最终目标是成为都市人可卸下铠甲、真实面对自我、精准链接同频者的\u201c精神家园\u201d。`,
  values: ["真诚链接", "同频成长", "双向奔赴", "价值共建"],
  history:
    `从最初一张咖啡桌旁十个人的小沙龙起步，君说乎已走过十年发展历程，累计举办近500场线上线下学习沙龙、课程与活动，覆盖法律、心理、教育、管理、健康、艺术、传统文化等多元领域，沉淀了一批有才华、有匠心的讲师团队，以及数千名热爱学习、认同社群理念的社群成员。\n\n十年间，社群经历了从初创到2019年三年的辉煌，也走过疫情期间的停摆与重启，始终坚守长期主义，完成了从\u201c单一活动社群\u201d到\u201c体系化成长生态\u201d的升级，形成了独特的社群文化——\u201c一群人学习一群人，一群人服务一群人，一群人帮助一群人。\u201d`,
  team: `社群核心用户为30-60岁群体，以70后、80后、90后为主体，包括创业者、自由职业者、企业中高管、公务员、教师等各界精英。区别于传统社群以\u201c知识输出\u201d为单一价值的模式，君说乎以\u201c情感链接＋确定性支持\u201d为核心价值，不仅解决用户的认知提升问题，更承接都市成年人的情绪内耗、孤独感、成长焦虑等底层需求，打造一个\u201c允许你不完美，只管真实\u201d的安全社交空间。`,
};

export default function AboutPage() {
  const [about, setAbout] = useState<AboutContent>(defaultAbout);

  useEffect(() => {
    fetch("/api/settings?key=about_content")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings?.about_content) {
          setAbout(data.settings.about_content);
        }
      })
      .catch(() => {
        // Keep defaults
      });
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* Breadcrumb */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors mb-8"
      >
        <ArrowLeft size={16} />
        返回首页
      </Link>

      {/* Page header */}
      <div className="text-center mb-14">
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
          {about.title}
        </h1>
        <p className="font-serif text-lg sm:text-xl text-text-secondary leading-relaxed max-w-2xl mx-auto">
          {about.intro}
        </p>
        <div className="mt-4 w-16 h-0.5 bg-primary/40 mx-auto rounded-full" />
      </div>

      {/* Section 1: 社群发展规划 */}
      <section className="mb-14">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">🌱</span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-text-primary">
            君说乎社群发展规划
          </h2>
        </div>

        <div className="card p-6 sm:p-8 space-y-6">
          {/* 核心理念 */}
          <div>
            <h3 className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">
              核心理念
            </h3>
            <div className="flex flex-wrap gap-3">
              {about.values.map((item) => (
                <span
                  key={item}
                  className="px-4 py-2 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <hr className="border-border-light" />

          {/* 核心定位 */}
          <div>
            <h3 className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">
              核心定位
            </h3>
            <div className="bg-accent-light/40 border border-border-light rounded-xl p-5">
              <p className="font-serif text-lg sm:text-xl text-text-primary text-center leading-relaxed">
                <span className="font-semibold">情绪价值</span>
                <span className="mx-2 text-primary">×</span>
                <span className="font-semibold">精准陪伴</span>
                <span className="mx-2 text-primary">=</span>
                <span className="font-semibold text-primary">都市人的精神自留地</span>
              </p>
            </div>
          </div>

          <hr className="border-border-light" />

          {/* 生态模式 */}
          <div>
            <h3 className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">
              生态模式
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: "💻", title: "线上数字家园", desc: "打破时空界限的学习交流平台" },
                { icon: "🏠", title: "线下实体之家", desc: "有温度的面对面连接空间" },
                { icon: "🤝", title: "共生商业生态", desc: "可持续的价值共建共享体系" },
              ].map((item) => (
                <div
                  key={item.title}
                  className="text-center p-5 rounded-xl bg-surface border border-border-light hover:border-primary/30 hover:shadow-card transition-all"
                >
                  <span className="text-3xl block mb-3">{item.icon}</span>
                  <h4 className="font-semibold text-text-primary mb-1">{item.title}</h4>
                  <p className="text-xs text-text-muted">{item.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-text-muted mt-3">
              三位一体 · 协同共生
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: 社群缘起与核心理念 */}
      <section className="mb-14">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">📜</span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-text-primary">
            社群缘起与核心理念
          </h2>
        </div>

        <div className="card p-6 sm:p-8 space-y-5">
          <blockquote className="border-l-4 border-primary/40 pl-5 py-2 bg-accent-light/30 rounded-r-lg">
            <p className="font-serif text-text-secondary italic leading-relaxed">
              &quot;学习是快乐的，相遇是幸运的，彼此理解是珍贵的。&quot;
            </p>
          </blockquote>

          {about.mission.split("\n\n").map((paragraph, i) => (
            <p key={i} className="text-text-secondary leading-loose">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      {/* Section 3: 十年发展沉淀 */}
      <section className="mb-14">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">⏳</span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-text-primary">
            十年发展沉淀
          </h2>
        </div>

        <div className="card p-6 sm:p-8 space-y-5">
          {/* Stat highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {[
              { num: "10+", label: "年发展历程" },
              { num: "500", label: "场学习活动" },
              { num: "7+", label: "覆盖领域" },
              { num: "数千", label: "社群成员" },
            ].map((s) => (
              <div key={s.label} className="text-center p-4 rounded-xl bg-accent-light/40">
                <div className="text-2xl sm:text-3xl font-bold text-primary font-serif">{s.num}</div>
                <div className="text-xs text-text-muted mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {about.history.split("\n\n").map((paragraph, i) => (
            <p key={i} className="text-text-secondary leading-loose">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      {/* Section 4: 核心定位与用户画像 */}
      <section className="mb-14">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">🎯</span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-text-primary">
            核心定位与用户画像
          </h2>
        </div>

        <div className="space-y-6">
          {/* Team / user portrait */}
          <div className="card p-6 sm:p-8">
            {about.team.split("\n\n").map((paragraph, i) => (
              <p key={i} className="text-text-secondary leading-loose mb-4 last:mb-0">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="gradient-accent rounded-2xl p-8 sm:p-12 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold mb-3">
            加入君说乎，遇见同频的灵魂
          </h2>
          <p className="text-text-secondary mb-6 max-w-lg mx-auto">
            无论你在哪个城市，从事什么职业，这里有一群等待与你相遇的同路人。
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-3 bg-primary text-text-inverse font-medium rounded-xl hover:bg-primary-dark transition-colors"
            >
              立即加入
            </Link>
            <Link
              href="/community"
              className="px-8 py-3 border-2 border-primary/30 text-primary font-medium rounded-xl hover:bg-primary/5 transition-colors"
            >
              探索社群
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
