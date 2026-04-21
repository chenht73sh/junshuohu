"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, ArrowUp, ArrowDown, X } from "lucide-react";

type Tab = "nav" | "hero" | "about" | "footer" | "contact";

interface NavItem {
  label: string;
  href: string;
  visible: boolean;
}

interface HeroContent {
  site_name: string;
  subtitle: string;
  description: string;
  cta_text: string;
  cta_button: string;
}

interface AboutContent {
  title: string;
  intro: string;
  mission: string;
  values: string[];
  history: string;
  team: string;
}

interface FooterLink {
  label: string;
  href: string;
}

interface FooterContent {
  slogan: string;
  values: string[];
  copyright: string;
  links: FooterLink[];
}

interface CustomField {
  key: string;
  value: string;
}

interface ContactInfo {
  wechat: string;
  email: string;
  phone: string;
  address: string;
  wechat_qrcode: string;
  custom_fields: CustomField[];
}

export default function AdminSettingsPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("nav");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [navMenu, setNavMenu] = useState<NavItem[]>([]);
  const [heroContent, setHeroContent] = useState<HeroContent>({
    site_name: "",
    subtitle: "",
    description: "",
    cta_text: "",
    cta_button: "",
  });
  const [aboutContent, setAboutContent] = useState<AboutContent>({
    title: "",
    intro: "",
    mission: "",
    values: [],
    history: "",
    team: "",
  });
  const [footerContent, setFooterContent] = useState<FooterContent>({
    slogan: "",
    values: [],
    copyright: "",
    links: [],
  });
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    wechat: "",
    email: "",
    phone: "",
    address: "",
    wechat_qrcode: "",
    custom_fields: [],
  });

  const fetchSettings = useCallback(() => {
    if (!token) return;
    setLoading(true);
    fetch("/api/admin/settings", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const s = data.settings || {};
        if (s.nav_menu) setNavMenu(s.nav_menu);
        if (s.hero_content) setHeroContent(s.hero_content);
        if (s.about_content) setAboutContent(s.about_content);
        if (s.footer_content) setFooterContent(s.footer_content);
        if (s.contact_info) setContactInfo(s.contact_info);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  async function handleSave(key: string, value: unknown) {
    if (!token) return;
    setSaving(true);
    setSuccessMsg("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key, value }),
      });
      if (res.ok) {
        setSuccessMsg("保存成功！");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        const data = await res.json();
        alert(data.error || "保存失败");
      }
    } catch {
      alert("网络错误");
    } finally {
      setSaving(false);
    }
  }

  // Nav menu helpers
  function moveNavItem(index: number, direction: -1 | 1) {
    const newItems = [...navMenu];
    const target = index + direction;
    if (target < 0 || target >= newItems.length) return;
    [newItems[index], newItems[target]] = [newItems[target], newItems[index]];
    setNavMenu(newItems);
  }

  function addNavItem() {
    setNavMenu([...navMenu, { label: "", href: "/", visible: true }]);
  }

  function removeNavItem(index: number) {
    setNavMenu(navMenu.filter((_, i) => i !== index));
  }

  function updateNavItem(index: number, field: keyof NavItem, value: string | boolean) {
    const newItems = [...navMenu];
    newItems[index] = { ...newItems[index], [field]: value };
    setNavMenu(newItems);
  }

  // Tag list helpers
  function addTag(list: string[], setList: (v: string[]) => void, tag: string) {
    if (tag.trim() && !list.includes(tag.trim())) {
      setList([...list, tag.trim()]);
    }
  }

  function removeTag(list: string[], setList: (v: string[]) => void, index: number) {
    setList(list.filter((_, i) => i !== index));
  }

  // Footer link helpers
  function addFooterLink() {
    setFooterContent({
      ...footerContent,
      links: [...footerContent.links, { label: "", href: "/" }],
    });
  }

  function removeFooterLink(index: number) {
    setFooterContent({
      ...footerContent,
      links: footerContent.links.filter((_, i) => i !== index),
    });
  }

  function updateFooterLink(index: number, field: keyof FooterLink, value: string) {
    const newLinks = [...footerContent.links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setFooterContent({ ...footerContent, links: newLinks });
  }

  // Custom field helpers
  function addCustomField() {
    setContactInfo({
      ...contactInfo,
      custom_fields: [...contactInfo.custom_fields, { key: "", value: "" }],
    });
  }

  function removeCustomField(index: number) {
    setContactInfo({
      ...contactInfo,
      custom_fields: contactInfo.custom_fields.filter((_, i) => i !== index),
    });
  }

  function updateCustomField(index: number, field: keyof CustomField, value: string) {
    const newFields = [...contactInfo.custom_fields];
    newFields[index] = { ...newFields[index], [field]: value };
    setContactInfo({ ...contactInfo, custom_fields: newFields });
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "nav", label: "导航菜单" },
    { key: "hero", label: "首页内容" },
    { key: "about", label: "关于我们" },
    { key: "footer", label: "页脚信息" },
    { key: "contact", label: "联系方式" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-bold text-text-primary">
          ⚙️ 站点设置
        </h1>
        <p className="text-sm text-text-muted mt-1">
          管理站点导航、首页内容、页脚信息等可配置内容
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSuccessMsg(""); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text-secondary hover:border-border"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium">
          ✅ {successMsg}
        </div>
      )}

      {/* Tab content */}
      <div className="card p-6">
        {/* ── Nav Menu ── */}
        {activeTab === "nav" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-text-primary">导航菜单项</h3>
              <button
                onClick={addNavItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
              >
                <Plus size={14} />
                新增菜单
              </button>
            </div>

            {navMenu.length === 0 ? (
              <p className="text-text-muted text-sm py-8 text-center">暂无菜单项</p>
            ) : (
              <div className="space-y-3">
                {navMenu.map((item, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-accent-light/30 border border-border-light rounded-lg"
                  >
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => moveNavItem(index, -1)}
                        disabled={index === 0}
                        className="p-1 text-text-muted hover:text-primary disabled:opacity-30 transition-colors"
                        title="上移"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => moveNavItem(index, 1)}
                        disabled={index === navMenu.length - 1}
                        className="p-1 text-text-muted hover:text-primary disabled:opacity-30 transition-colors"
                        title="下移"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => updateNavItem(index, "label", e.target.value)}
                      placeholder="菜单名称"
                      className="flex-1 min-w-0 px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                    />
                    <input
                      type="text"
                      value={item.href}
                      onChange={(e) => updateNavItem(index, "href", e.target.value)}
                      placeholder="链接地址"
                      className="flex-1 min-w-0 px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text-primary font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                    />
                    <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.visible}
                        onChange={(e) => updateNavItem(index, "visible", e.target.checked)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                      />
                      <span className="text-sm text-text-secondary">显示</span>
                    </label>
                    <button
                      onClick={() => removeNavItem(index)}
                      className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded transition-colors shrink-0"
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-border-light">
              <button
                onClick={() => handleSave("nav_menu", navMenu)}
                disabled={saving}
                className="px-6 py-2.5 bg-primary text-text-inverse rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors font-medium text-sm"
              >
                {saving ? "保存中..." : "保存导航菜单"}
              </button>
            </div>
          </div>
        )}

        {/* ── Hero Content ── */}
        {activeTab === "hero" && (
          <div className="space-y-4">
            <h3 className="font-medium text-text-primary mb-2">首页 Hero 区域</h3>

            <div>
              <label className="block text-sm text-text-secondary mb-1">站点名称</label>
              <input
                type="text"
                value={heroContent.site_name}
                onChange={(e) => setHeroContent({ ...heroContent, site_name: e.target.value })}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">副标题</label>
              <input
                type="text"
                value={heroContent.subtitle}
                onChange={(e) => setHeroContent({ ...heroContent, subtitle: e.target.value })}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">描述文字</label>
              <textarea
                value={heroContent.description}
                onChange={(e) => setHeroContent({ ...heroContent, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors resize-y"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">CTA 文案</label>
              <input
                type="text"
                value={heroContent.cta_text}
                onChange={(e) => setHeroContent({ ...heroContent, cta_text: e.target.value })}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">CTA 按钮文字</label>
              <input
                type="text"
                value={heroContent.cta_button}
                onChange={(e) => setHeroContent({ ...heroContent, cta_button: e.target.value })}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
              />
            </div>

            <div className="pt-4 border-t border-border-light">
              <button
                onClick={() => handleSave("hero_content", heroContent)}
                disabled={saving}
                className="px-6 py-2.5 bg-primary text-text-inverse rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors font-medium text-sm"
              >
                {saving ? "保存中..." : "保存首页内容"}
              </button>
            </div>
          </div>
        )}

        {/* ── About Content ── */}
        {activeTab === "about" && (
          <div className="space-y-4">
            <h3 className="font-medium text-text-primary mb-2">关于我们页面</h3>

            <div>
              <label className="block text-sm text-text-secondary mb-1">页面标题</label>
              <input
                type="text"
                value={aboutContent.title}
                onChange={(e) => setAboutContent({ ...aboutContent, title: e.target.value })}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">简介</label>
              <textarea
                value={aboutContent.intro}
                onChange={(e) => setAboutContent({ ...aboutContent, intro: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors resize-y"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">使命愿景</label>
              <textarea
                value={aboutContent.mission}
                onChange={(e) => setAboutContent({ ...aboutContent, mission: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors resize-y"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">核心价值观</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {aboutContent.values.map((v, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-full border border-primary/20"
                  >
                    {v}
                    <button
                      onClick={() => removeTag(aboutContent.values, (vals) => setAboutContent({ ...aboutContent, values: vals }), i)}
                      className="hover:text-error transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="about-value-input"
                  placeholder="输入标签后回车"
                  className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const input = e.currentTarget;
                      addTag(aboutContent.values, (vals) => setAboutContent({ ...aboutContent, values: vals }), input.value);
                      input.value = "";
                    }
                  }}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">发展历程</label>
              <textarea
                value={aboutContent.history}
                onChange={(e) => setAboutContent({ ...aboutContent, history: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors resize-y"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">团队介绍</label>
              <textarea
                value={aboutContent.team}
                onChange={(e) => setAboutContent({ ...aboutContent, team: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors resize-y"
              />
            </div>

            <div className="pt-4 border-t border-border-light">
              <button
                onClick={() => handleSave("about_content", aboutContent)}
                disabled={saving}
                className="px-6 py-2.5 bg-primary text-text-inverse rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors font-medium text-sm"
              >
                {saving ? "保存中..." : "保存关于我们"}
              </button>
            </div>
          </div>
        )}

        {/* ── Footer Content ── */}
        {activeTab === "footer" && (
          <div className="space-y-4">
            <h3 className="font-medium text-text-primary mb-2">页脚信息</h3>

            <div>
              <label className="block text-sm text-text-secondary mb-1">标语</label>
              <input
                type="text"
                value={footerContent.slogan}
                onChange={(e) => setFooterContent({ ...footerContent, slogan: e.target.value })}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1">核心价值观标签</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {footerContent.values.map((v, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-full border border-primary/20"
                  >
                    {v}
                    <button
                      onClick={() => removeTag(footerContent.values, (vals) => setFooterContent({ ...footerContent, values: vals }), i)}
                      className="hover:text-error transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="输入标签后回车"
                  className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const input = e.currentTarget;
                      addTag(footerContent.values, (vals) => setFooterContent({ ...footerContent, values: vals }), input.value);
                      input.value = "";
                    }
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1">版权信息</label>
              <input
                type="text"
                value={footerContent.copyright}
                onChange={(e) => setFooterContent({ ...footerContent, copyright: e.target.value })}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-text-secondary">底部链接</label>
                <button
                  onClick={addFooterLink}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                >
                  <Plus size={12} />
                  新增链接
                </button>
              </div>
              <div className="space-y-2">
                {footerContent.links.map((link, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => updateFooterLink(index, "label", e.target.value)}
                      placeholder="链接文字"
                      className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                    />
                    <input
                      type="text"
                      value={link.href}
                      onChange={(e) => updateFooterLink(index, "href", e.target.value)}
                      placeholder="链接地址"
                      className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text-primary font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                    />
                    <button
                      onClick={() => removeFooterLink(index)}
                      className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-border-light">
              <button
                onClick={() => handleSave("footer_content", footerContent)}
                disabled={saving}
                className="px-6 py-2.5 bg-primary text-text-inverse rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors font-medium text-sm"
              >
                {saving ? "保存中..." : "保存页脚信息"}
              </button>
            </div>
          </div>
        )}

        {/* ── Contact Info ── */}
        {activeTab === "contact" && (
          <div className="space-y-4">
            <h3 className="font-medium text-text-primary mb-2">联系方式</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">微信号</label>
                <input
                  type="text"
                  value={contactInfo.wechat}
                  onChange={(e) => setContactInfo({ ...contactInfo, wechat: e.target.value })}
                  placeholder="选填"
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">邮箱</label>
                <input
                  type="email"
                  value={contactInfo.email}
                  onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                  placeholder="选填"
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">电话</label>
                <input
                  type="tel"
                  value={contactInfo.phone}
                  onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                  placeholder="选填"
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">地址</label>
                <input
                  type="text"
                  value={contactInfo.address}
                  onChange={(e) => setContactInfo({ ...contactInfo, address: e.target.value })}
                  placeholder="选填"
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1">微信二维码图片 URL</label>
              <input
                type="url"
                value={contactInfo.wechat_qrcode}
                onChange={(e) => setContactInfo({ ...contactInfo, wechat_qrcode: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-text-secondary">自定义字段</label>
                <button
                  onClick={addCustomField}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                >
                  <Plus size={12} />
                  新增字段
                </button>
              </div>
              <div className="space-y-2">
                {contactInfo.custom_fields.map((field, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={field.key}
                      onChange={(e) => updateCustomField(index, "key", e.target.value)}
                      placeholder="字段名"
                      className="w-1/3 px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                    />
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => updateCustomField(index, "value", e.target.value)}
                      placeholder="字段值"
                      className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                    />
                    <button
                      onClick={() => removeCustomField(index)}
                      className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-border-light">
              <button
                onClick={() => handleSave("contact_info", contactInfo)}
                disabled={saving}
                className="px-6 py-2.5 bg-primary text-text-inverse rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors font-medium text-sm"
              >
                {saving ? "保存中..." : "保存联系方式"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
