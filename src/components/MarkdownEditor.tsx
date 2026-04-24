"use client";

import { useRef, useCallback } from "react";
import { marked } from "marked";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  Code,
  Minus,
  Link as LinkIcon,
} from "lucide-react";

// Configure marked options
marked.setOptions({
  breaks: true,
  gfm: true,
});

// Basic XSS sanitizer — removes script/iframe tags and on* attributes
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<[^>]+ on\w+="[^"]*"/gi, "")
    .replace(/<[^>]+ on\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

function renderMarkdown(text: string): string {
  const html = marked.parse(text) as string;
  return sanitizeHtml(html);
}

interface ToolbarButton {
  icon: React.ReactNode;
  title: string;
  before: string;
  after: string;
  placeholder?: string;
  block?: boolean;
}

const TOOLBAR_BUTTONS: ToolbarButton[] = [
  { icon: <Bold size={14} />, title: "粗体", before: "**", after: "**", placeholder: "粗体文字" },
  { icon: <Italic size={14} />, title: "斜体", before: "_", after: "_", placeholder: "斜体文字" },
  { icon: <Heading1 size={14} />, title: "一级标题", before: "# ", after: "", block: true },
  { icon: <Heading2 size={14} />, title: "二级标题", before: "## ", after: "", block: true },
  { icon: <List size={14} />, title: "列表", before: "- ", after: "", block: true },
  { icon: <Code size={14} />, title: "代码块", before: "```\n", after: "\n```", placeholder: "代码" },
  { icon: <Minus size={14} />, title: "分割线", before: "\n---\n", after: "" },
  { icon: <LinkIcon size={14} />, title: "链接", before: "[", after: "](url)", placeholder: "链接文字" },
];

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = "支持 Markdown 格式，在左侧编写，右侧实时预览...",
  rows = 16,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertText = useCallback(
    (btn: ToolbarButton) => {
      const ta = textareaRef.current;
      if (!ta) return;

      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = value.substring(start, end) || btn.placeholder || "";

      let insertion: string;
      if (btn.block) {
        // For block-level elements, insert at start of line
        const lineStart = value.lastIndexOf("\n", start - 1) + 1;
        const prefix = btn.before;
        const lineText = value.substring(lineStart, end);
        const newText =
          value.substring(0, lineStart) +
          prefix +
          lineText +
          btn.after +
          value.substring(end);
        onChange(newText);
        setTimeout(() => {
          ta.focus();
          ta.setSelectionRange(lineStart + prefix.length, lineStart + prefix.length + lineText.length);
        }, 0);
        return;
      } else {
        insertion = btn.before + selected + btn.after;
      }

      const newValue =
        value.substring(0, start) + insertion + value.substring(end);
      onChange(newValue);

      setTimeout(() => {
        ta.focus();
        const cursorPos = start + btn.before.length + selected.length;
        ta.setSelectionRange(cursorPos, cursorPos);
      }, 0);
    },
    [value, onChange]
  );

  const minHeight = `${rows * 1.625}rem`;

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-bg focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-colors">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-accent-light/30 flex-wrap">
        {TOOLBAR_BUTTONS.map((btn) => (
          <button
            key={btn.title}
            type="button"
            title={btn.title}
            onClick={() => insertText(btn)}
            className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded transition-colors"
          >
            {btn.icon}
          </button>
        ))}
        <div className="ml-auto text-xs text-text-muted px-2 hidden sm:block">
          支持 Markdown
        </div>
      </div>

      {/* Split pane */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
        {/* Editor */}
        <div className="relative">
          <div className="px-3 py-1.5 text-xs text-text-muted bg-accent-light/20 border-b border-border/50 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary/40" />
            编写
          </div>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-3 bg-transparent text-text-primary placeholder:text-text-muted resize-none focus:outline-none font-mono text-sm leading-relaxed"
            style={{ minHeight }}
          />
        </div>

        {/* Preview */}
        <div className="relative">
          <div className="px-3 py-1.5 text-xs text-text-muted bg-accent-light/20 border-b border-border/50 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success/40" />
            预览
          </div>
          <div
            className="px-4 py-3 prose-warm text-text-primary text-sm leading-relaxed overflow-auto"
            style={{ minHeight }}
            dangerouslySetInnerHTML={{
              __html: value.trim()
                ? renderMarkdown(value)
                : `<p class="text-text-muted italic">预览区域（在左侧输入内容后实时显示）</p>`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
