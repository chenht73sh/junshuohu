"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

const defaultFooter: FooterContent = {
  slogan: "都市人的精神自留地",
  values: ["真诚链接", "同频成长", "双向奔赴", "价值共建"],
  copyright: "© 2026 君说乎 · 数字家园。用温暖连接每一颗有趣的灵魂。",
  links: [
    { label: "社群板块", href: "/categories" },
    { label: "课程报名", href: "/courses" },
    { label: "关于我们", href: "/about" },
  ],
};

const defaultContact: ContactInfo = {
  wechat: "",
  email: "",
  phone: "",
  address: "",
  wechat_qrcode: "",
  custom_fields: [],
};

function hasContactInfo(info: ContactInfo): boolean {
  return !!(info.wechat || info.email || info.phone || info.address || info.custom_fields.length > 0);
}

export default function Footer() {
  const [footer, setFooter] = useState<FooterContent>(defaultFooter);
  const [contact, setContact] = useState<ContactInfo>(defaultContact);

  useEffect(() => {
    fetch("/api/settings?keys=footer_content,contact_info")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings?.footer_content) setFooter(data.settings.footer_content);
        if (data.settings?.contact_info) setContact(data.settings.contact_info);
      })
      .catch(() => {
        // Keep defaults on error
      });
  }, []);

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
            {footer.slogan}
          </p>
        </div>

        {/* Core values */}
        {footer.values.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            {footer.values.map((value) => (
              <span
                key={value}
                className="px-4 py-1.5 text-sm text-text-secondary bg-accent-light/50 rounded-full"
              >
                {value}
              </span>
            ))}
          </div>
        )}

        {/* Links */}
        {footer.links.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-6 mb-8 text-sm text-text-muted">
            {footer.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        {/* Contact info */}
        {hasContactInfo(contact) && (
          <div className="flex flex-wrap items-center justify-center gap-6 mb-8 text-sm text-text-muted">
            {contact.wechat && <span>微信：{contact.wechat}</span>}
            {contact.email && <span>邮箱：{contact.email}</span>}
            {contact.phone && <span>电话：{contact.phone}</span>}
            {contact.address && <span>地址：{contact.address}</span>}
            {contact.custom_fields.map((field) => (
              <span key={field.key}>{field.key}：{field.value}</span>
            ))}
          </div>
        )}

        {/* Copyright */}
        <div className="text-center text-xs text-text-muted pt-6 border-t border-border-light">
          {footer.copyright}
        </div>
      </div>
    </footer>
  );
}
