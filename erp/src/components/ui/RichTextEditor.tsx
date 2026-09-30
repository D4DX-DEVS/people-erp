import { useEffect, useRef } from "react";
import {
  Bold, Italic, Underline, Strikethrough, Heading2, Heading3, List, ListOrdered, Quote,
  AlignLeft, AlignCenter, AlignRight, Link as LinkIcon, Eraser, Undo2, Redo2, Pilcrow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isHtml } from "@/lib/richText";
import { sanitizeHtml } from "@/lib/richText";

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Legacy plain text → paragraphs, so existing content opens with its structure intact. */
const toHtml = (v: string) =>
  isHtml(v) ? sanitizeHtml(v).replace(/<a target="_blank" rel="noopener noreferrer" /g, "<a ") :
  v.split(/\n\s*\n/).filter(Boolean).map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("");

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  disabled?: boolean;
  className?: string;
}

/** Lightweight WYSIWYG editor (bold, italic, headings, lists, alignment, links). Stores HTML. */
export function RichTextEditor({ value, onChange, placeholder, minHeight = 160, disabled, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef<string>("");

  // Sync from props only when the change came from outside (not from typing).
  useEffect(() => {
    if (!ref.current || value === last.current) return;
    ref.current.innerHTML = toHtml(value || "");
    last.current = value;
  }, [value]);

  const emit = () => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    const empty = !ref.current.textContent?.trim() && !/<(ul|ol|hr)/i.test(html);
    const out = empty ? "" : html;
    last.current = out;
    onChange(out);
  };

  const exec = (cmd: string, arg?: string) => {
    if (disabled) return;
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  };

  const link = () => {
    const url = window.prompt("Link URL (leave empty to remove)", "https://");
    if (url === null) return;
    if (!url.trim()) exec("unlink");
    else exec("createLink", url.trim());
  };

  const Btn = ({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) => (
    <button type="button" title={label} aria-label={label} disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40">
      {children}
    </button>
  );
  const Sep = () => <span className="mx-1 h-5 w-px bg-border" />;

  return (
    <div className={cn("overflow-hidden rounded-md border border-input bg-background", className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 px-1.5 py-1">
        <Btn label="Bold" onClick={() => exec("bold")}><Bold className="h-4 w-4" /></Btn>
        <Btn label="Italic" onClick={() => exec("italic")}><Italic className="h-4 w-4" /></Btn>
        <Btn label="Underline" onClick={() => exec("underline")}><Underline className="h-4 w-4" /></Btn>
        <Btn label="Strikethrough" onClick={() => exec("strikeThrough")}><Strikethrough className="h-4 w-4" /></Btn>
        <Sep />
        <Btn label="Heading" onClick={() => exec("formatBlock", "H2")}><Heading2 className="h-4 w-4" /></Btn>
        <Btn label="Subheading" onClick={() => exec("formatBlock", "H3")}><Heading3 className="h-4 w-4" /></Btn>
        <Btn label="Paragraph" onClick={() => exec("formatBlock", "P")}><Pilcrow className="h-4 w-4" /></Btn>
        <Sep />
        <Btn label="Bulleted list" onClick={() => exec("insertUnorderedList")}><List className="h-4 w-4" /></Btn>
        <Btn label="Numbered list" onClick={() => exec("insertOrderedList")}><ListOrdered className="h-4 w-4" /></Btn>
        <Btn label="Quote" onClick={() => exec("formatBlock", "BLOCKQUOTE")}><Quote className="h-4 w-4" /></Btn>
        <Sep />
        <Btn label="Align left" onClick={() => exec("justifyLeft")}><AlignLeft className="h-4 w-4" /></Btn>
        <Btn label="Align center" onClick={() => exec("justifyCenter")}><AlignCenter className="h-4 w-4" /></Btn>
        <Btn label="Align right" onClick={() => exec("justifyRight")}><AlignRight className="h-4 w-4" /></Btn>
        <Sep />
        <Btn label="Link" onClick={link}><LinkIcon className="h-4 w-4" /></Btn>
        <Btn label="Clear formatting" onClick={() => exec("removeFormat")}><Eraser className="h-4 w-4" /></Btn>
        <Btn label="Undo" onClick={() => exec("undo")}><Undo2 className="h-4 w-4" /></Btn>
        <Btn label="Redo" onClick={() => exec("redo")}><Redo2 className="h-4 w-4" /></Btn>
      </div>
      <div
        ref={ref}
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        onPaste={(e) => {
          // Paste as plain text so pasted Word/web styling doesn't leak in.
          e.preventDefault();
          document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
        }}
        className="rich-content rich-editor px-3 py-2 text-sm focus:outline-none"
        style={{ minHeight }}
      />
    </div>
  );
}

export default RichTextEditor;
