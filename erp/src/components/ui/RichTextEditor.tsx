import { useEffect, useRef, useState } from "react";
import {
  Bold, Italic, Underline, Strikethrough, Heading2, Heading3, List, ListOrdered, Quote,
  AlignLeft, AlignCenter, AlignRight, Link as LinkIcon, Eraser, Undo2, Redo2, Pilcrow, Table as TableIcon, Trash2,
  ImagePlus, Image as ImageIcon, Loader2,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
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
  /**
   * Tallest the writing area grows before it scrolls inside itself, so the
   * toolbar never scrolls out of view with the text. Any CSS length.
   */
  maxHeight?: number | string;
  disabled?: boolean;
  className?: string;
  /** Offer the table tool: insert a table, then add/remove rows and columns, header row, style and alignment. */
  tables?: boolean;
  /**
   * Offer the image tool: images placed between paragraphs, floated beside the
   * text or full width, with size and caption. Uploads the file and resolves
   * to its public URL.
   */
  uploadImage?: (file: File) => Promise<string>;
}

// ── table helpers ─────────────────────────────────────────────────────────
// Table looks are stored as tokens in `data-style` (see .rich-content table
// rules in index.css): a variant (grid | striped | minimal) plus "compact" and
// "fit" (shrink to content instead of full width).
const VARIANTS = [
  { value: "grid", label: "Grid" },
  { value: "striped", label: "Striped" },
  { value: "minimal", label: "Minimal" },
] as const;
const PICKER_SIZE = 8;

const styleTokens = (table: HTMLTableElement) => (table.dataset.style || "").split(/\s+/).filter(Boolean);
const variantOf = (table: HTMLTableElement) => styleTokens(table).find((t) => VARIANTS.some((v) => v.value === t)) || "grid";

function newCell(tag: "td" | "th", align?: string) {
  const cell = document.createElement(tag);
  cell.innerHTML = "<br>";
  if (align) cell.style.textAlign = align;
  return cell;
}

function tableHtml(rows: number, cols: number) {
  const head = `<thead><tr>${Array.from({ length: cols }, (_, i) => `<th>Heading ${i + 1}</th>`).join("")}</tr></thead>`;
  const body = Array.from({ length: Math.max(1, rows - 1) }, () => `<tr>${"<td><br></td>".repeat(cols)}</tr>`).join("");
  return `<table data-style="grid">${head}<tbody>${body}</tbody></table><p><br></p>`;
}

// ── image helpers ─────────────────────────────────────────────────────────
// An inline image is a <figure> block: data-align (left | right float with the
// text wrapping, center, full) and data-size (sm | md | lg), or several <img>
// side by side with data-layout="row"; an optional <figcaption>. Rules live in
// index.css under ".rich-content figure". Figures are not editable in place —
// clicking one selects it and the image bar edits it.
const IMAGE_ALIGNS = [
  { value: "left", label: "Left", title: "Float left — the text wraps on its right" },
  { value: "center", label: "Center", title: "On its own line, centred" },
  { value: "right", label: "Right", title: "Float right — the text wraps on its left" },
  { value: "full", label: "Full width", title: "On its own line, full width" },
] as const;
const IMAGE_SIZES = [
  { value: "sm", label: "S", title: "Small" },
  { value: "md", label: "M", title: "Medium" },
  { value: "lg", label: "L", title: "Large" },
] as const;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const lockFigures = (root: HTMLElement) => root.querySelectorAll("figure").forEach((f) => f.setAttribute("contenteditable", "false"));

/** The direct child of the editor that contains `node` (null when outside, or the editor itself). */
function topBlock(node: Node | null, root: HTMLElement): ChildNode | null {
  if (!node || node === root) return null;
  let n: Node | null = node;
  while (n && n.parentNode !== root) n = n.parentNode;
  return (n as ChildNode) || null;
}

function buildFigure(urls: string[]): HTMLElement {
  const fig = document.createElement("figure");
  fig.setAttribute("contenteditable", "false");
  if (urls.length > 1) fig.dataset.layout = "row";
  else { fig.dataset.align = "center"; fig.dataset.size = "lg"; }
  urls.forEach((u) => {
    const img = document.createElement("img");
    img.src = u;
    img.alt = "";
    fig.appendChild(img);
  });
  return fig;
}

/** Put the caret at the start of a cell, so the table toolbar stays on it after an edit. */
function focusCell(cell?: Element | null) {
  if (!cell) return;
  const range = document.createRange();
  range.selectNodeContents(cell);
  range.collapse(true);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

// Toolbar parts live at module level: defined inside the editor they would be
// new component types on every render, so each re-render would remount their
// buttons. Inside a dialog that remount, landing while focus is moving from the
// text to a toolbar field, lets the dialog's focus trap pull focus away.
function Btn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40">
      {children}
    </button>
  );
}
const Sep = () => <span className="mx-1 h-5 w-px bg-border" />;
/** Text button for the table/image bars; keeps the editor selection on click. */
function TBtn({ label, onClick, active, danger, title, disabled }: {
  label: string; onClick: () => void; active?: boolean; danger?: boolean; title?: string; disabled?: boolean;
}) {
  return (
    <button type="button" title={title || label} disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className={cn(
        "rounded px-1.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-40",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
        danger && "text-destructive hover:bg-destructive/10 hover:text-destructive",
      )}>
      {label}
    </button>
  );
}

/** Lightweight WYSIWYG editor (bold, italic, headings, lists, alignment, links, optional tables). Stores HTML. */
export function RichTextEditor({ value, onChange, placeholder, minHeight = 160, maxHeight = "60vh", disabled, className, tables, uploadImage }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  /** "new" inserts a figure at the caret; "append" adds to the selected image row. */
  const imageMode = useRef<"new" | "append">("new");
  const [figure, setFigure] = useState<HTMLElement | null>(null);
  const [figureImg, setFigureImg] = useState<HTMLImageElement | null>(null);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const last = useRef<string>("");
  const savedRange = useRef<Range | null>(null);
  const [cell, setCell] = useState<HTMLTableCellElement | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hover, setHover] = useState<[number, number]>([0, 0]);
  // Table edits mutate the DOM directly; bump this so the table bar re-reads it.
  const [, bump] = useState(0);

  // Sync from props only when the change came from outside (not from typing).
  useEffect(() => {
    if (!ref.current || value === last.current) return;
    ref.current.innerHTML = toHtml(value || "");
    lockFigures(ref.current);
    last.current = value;
    setFigure(null);
  }, [value]);

  // Clicking anywhere outside the editor drops the image selection.
  useEffect(() => {
    if (!figure) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) selectFigure(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [figure]);

  // Track which table cell (if any) holds the caret, to show the table toolbar.
  useEffect(() => {
    if (!tables) return;
    const onSelection = () => {
      const node = window.getSelection()?.anchorNode;
      const root = ref.current;
      if (!node || !root || !root.contains(node)) {
        // Focus moved to the toolbar/picker — keep the last cell.
        if (document.activeElement && root?.parentElement?.contains(document.activeElement)) return;
        setCell(null);
        return;
      }
      const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
      const td = el?.closest("td,th") as HTMLTableCellElement | null;
      setCell(td && root.contains(td) ? td : null);
    };
    document.addEventListener("selectionchange", onSelection);
    return () => document.removeEventListener("selectionchange", onSelection);
  }, [tables]);

  const emit = () => {
    if (!ref.current) return;
    // data-selected is the editor's own highlight, never content.
    const html = ref.current.innerHTML.replace(/ data-selected="[^"]*"/g, "");
    const empty = !ref.current.textContent?.trim() && !/<(ul|ol|hr|table|figure|img)/i.test(html);
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

  // ── image actions ────────────────────────────────────────────────────────
  function selectFigure(fig: HTMLElement | null, img?: HTMLImageElement | null) {
    ref.current?.querySelectorAll("figure[data-selected]").forEach((f) => f.removeAttribute("data-selected"));
    if (fig) fig.setAttribute("data-selected", "");
    setFigure(fig);
    setFigureImg(fig ? img || fig.querySelector("img") : null);
  }

  /** Upload the picked files one by one; returns the URLs that made it. */
  const uploadAll = async (files: File[]) => {
    if (!uploadImage) return [];
    const ok = files.filter((f) => /^image\/(jpe?g|png|webp|gif)$/i.test(f.type) && f.size <= MAX_IMAGE_BYTES);
    const skipped = files.length - ok.length;
    const urls: string[] = [];
    setUploading({ done: 0, total: ok.length });
    for (let i = 0; i < ok.length; i++) {
      try { urls.push(await uploadImage(ok[i])); } catch { /* counted below */ }
      setUploading({ done: i + 1, total: ok.length });
    }
    setUploading(null);
    const failed = skipped + (ok.length - urls.length);
    if (failed) {
      toast({
        title: `${failed} image${failed > 1 ? "s" : ""} not added`,
        description: "Use JPG, PNG, WebP or GIF files up to 5MB.",
        variant: "destructive",
      });
    }
    return urls;
  };

  const onImagesPicked = async (list: FileList | null) => {
    const root = ref.current;
    if (!list?.length || !root || disabled) return;
    const urls = await uploadAll(Array.from(list));
    if (!urls.length) return;

    if (imageMode.current === "append" && figure && root.contains(figure)) {
      urls.forEach((u) => { const img = document.createElement("img"); img.src = u; img.alt = ""; figure.insertBefore(img, figure.querySelector("figcaption")); });
      figure.dataset.layout = "row";
      delete figure.dataset.align;
      delete figure.dataset.size;
      emit();
      selectFigure(figure);
      return;
    }

    // Images sit between blocks, never inside a paragraph: after the block the
    // caret was in, or in place of an empty line.
    const fig = buildFigure(urls);
    const anchor = savedRange.current ? topBlock(savedRange.current.startContainer, root) : null;
    const emptyLine = anchor instanceof HTMLElement && !anchor.textContent?.trim() && !anchor.querySelector("img,table,figure");
    if (anchor && emptyLine) anchor.before(fig);
    else if (anchor) anchor.after(fig);
    else root.appendChild(fig);
    if (!fig.nextElementSibling) {
      const p = document.createElement("p");
      p.innerHTML = "<br>";
      fig.after(p);
    }
    emit();
    selectFigure(fig);
  };

  const onReplacePicked = async (list: FileList | null) => {
    if (!list?.length || !figureImg) return;
    const [url] = await uploadAll([list[0]]);
    if (!url) return;
    figureImg.src = url;
    emit();
    bump((n) => n + 1);
  };

  /** Edit the selected figure, save, and redraw the image bar. */
  const figureEdit = (fn: (fig: HTMLElement) => void) => {
    if (!figure || disabled || !ref.current?.contains(figure)) return;
    fn(figure);
    emit();
    bump((n) => n + 1);
  };

  const setImageAlign = (align: string) => figureEdit((f) => {
    f.dataset.align = align;
    if (!f.dataset.size) f.dataset.size = align === "left" || align === "right" ? "md" : "lg";
  });
  const setImageSize = (size: string) => figureEdit((f) => { f.dataset.size = size; });
  const setCaption = (text: string) => figureEdit((f) => {
    let cap = f.querySelector("figcaption");
    if (text) {
      if (!cap) { cap = document.createElement("figcaption"); f.appendChild(cap); }
      cap.textContent = text;
    } else cap?.remove();
    f.querySelectorAll("img").forEach((img) => { img.alt = text; });
  });
  const moveFigure = (dir: -1 | 1) => figureEdit((f) => {
    const sib = dir < 0 ? f.previousElementSibling : f.nextElementSibling;
    if (sib) (dir < 0 ? sib.before(f) : sib.after(f));
  });
  const removeFigure = () => {
    if (!figure || disabled) return;
    figure.remove();
    selectFigure(null);
    emit();
  };
  /** Image rows: drop just the clicked picture; a row left with one becomes a normal image. */
  const removeRowImage = () => {
    if (!figure || !figureImg) return;
    figureImg.remove();
    const left = figure.querySelectorAll("img");
    if (!left.length) { removeFigure(); return; }
    if (left.length === 1) { delete figure.dataset.layout; figure.dataset.align = "center"; figure.dataset.size = "lg"; }
    emit();
    selectFigure(figure);
  };

  const onEditorClick = (e: React.MouseEvent) => {
    if (!uploadImage) return;
    const target = e.target as HTMLElement;
    const fig = target.closest("figure");
    if (fig && ref.current?.contains(fig)) selectFigure(fig as HTMLElement, target.tagName === "IMG" ? (target as HTMLImageElement) : null);
    else if (figure) selectFigure(null);
  };

  // ── table actions ────────────────────────────────────────────────────────
  const rememberCaret = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && ref.current?.contains(sel.anchorNode)) savedRange.current = sel.getRangeAt(0).cloneRange();
    else savedRange.current = null;
  };

  const insertTable = (rows: number, cols: number) => {
    setPickerOpen(false);
    const root = ref.current;
    if (!root || disabled) return;
    root.focus();
    const sel = window.getSelection();
    sel?.removeAllRanges();
    if (savedRange.current) {
      sel?.addRange(savedRange.current);
    } else {
      const end = document.createRange();
      end.selectNodeContents(root);
      end.collapse(false);
      sel?.addRange(end);
    }
    document.execCommand("insertHTML", false, tableHtml(rows, cols));
    emit();
  };

  /** Run a DOM edit on the current table, then save and keep the caret in `focus` (if returned). */
  const tableEdit = (fn: (ctx: { table: HTMLTableElement; row: HTMLTableRowElement; col: number }) => Element | null | void) => {
    if (!cell || disabled) return;
    const table = cell.closest("table");
    const row = cell.parentElement as HTMLTableRowElement | null;
    if (!table || !row || !ref.current?.contains(table)) return;
    const target = fn({ table, row, col: cell.cellIndex });
    emit();
    bump((n) => n + 1);
    if (target && ref.current.contains(target)) {
      focusCell(target);
      setCell(target.closest("td,th") as HTMLTableCellElement);
    } else {
      setCell(null);
    }
  };

  const colAlign = (table: HTMLTableElement, col: number) => (table.rows[table.rows.length - 1]?.cells[col] as HTMLElement | undefined)?.style.textAlign || "";

  const addRow = (below: boolean) => tableEdit(({ table, row }) => {
    const inHead = row.parentElement?.tagName === "THEAD";
    const fresh = document.createElement("tr");
    for (let c = 0; c < row.cells.length; c++) fresh.appendChild(newCell("td", colAlign(table, c)));
    if (inHead) {
      // Rows never go into the header; "below" the header is the top of the body.
      const body = table.tBodies[0] || table.createTBody();
      body.insertBefore(fresh, body.firstChild);
    } else if (below) row.after(fresh);
    else row.before(fresh);
    return fresh.cells[0];
  });

  const addCol = (right: boolean) => tableEdit(({ table, col }) => {
    const at = right ? col + 1 : col;
    let focus: Element | null = null;
    Array.from(table.rows).forEach((r) => {
      const tag = r.parentElement?.tagName === "THEAD" ? "th" : "td";
      const fresh = newCell(tag);
      const before = r.cells[at] || null;
      r.insertBefore(fresh, before);
      if (r === cell?.parentElement) focus = fresh;
    });
    return focus;
  });

  const deleteRow = () => tableEdit(({ table, row }) => {
    const section = row.parentElement;
    const index = Array.from(table.rows).indexOf(row);
    row.remove();
    if (section && !section.children.length) section.remove();
    if (!table.rows.length) { table.remove(); return null; }
    return table.rows[Math.min(index, table.rows.length - 1)].cells[0];
  });

  const deleteCol = () => tableEdit(({ table, row, col }) => {
    Array.from(table.rows).forEach((r) => { if (r.cells[col]) r.deleteCell(col); });
    if (!row.cells.length) { table.remove(); return null; }
    return row.cells[Math.min(col, row.cells.length - 1)];
  });

  const toggleHeader = () => tableEdit(({ table, row, col }) => {
    const swap = (r: HTMLTableRowElement, tag: "td" | "th") => {
      Array.from(r.cells).forEach((c) => {
        const next = document.createElement(tag);
        next.innerHTML = c.innerHTML;
        if ((c as HTMLElement).style.textAlign) next.style.textAlign = (c as HTMLElement).style.textAlign;
        c.replaceWith(next);
      });
    };
    if (table.tHead) {
      const head = table.tHead;
      const body = table.tBodies[0] || table.createTBody();
      Array.from(head.rows).reverse().forEach((r) => { swap(r, "td"); body.insertBefore(r, body.firstChild); });
      head.remove();
    } else {
      const first = table.rows[0];
      if (!first) return null;
      swap(first, "th");
      const head = table.createTHead();
      head.appendChild(first);
    }
    return row.cells[col] || table.rows[0]?.cells[0];
  });

  const setStyle = (mutate: (tokens: string[]) => string[]) => tableEdit(({ table, row, col }) => {
    table.dataset.style = mutate(styleTokens(table)).join(" ");
    return row.cells[col];
  });
  const setVariant = (variant: string) => setStyle((t) => [variant, ...t.filter((x) => !VARIANTS.some((v) => v.value === x))]);
  const toggleToken = (token: string) => setStyle((t) => (t.includes(token) ? t.filter((x) => x !== token) : [...t, token]));

  const alignCol = (align: "left" | "center" | "right") => tableEdit(({ table, row, col }) => {
    Array.from(table.rows).forEach((r) => { const c = r.cells[col] as HTMLElement | undefined; if (c) c.style.textAlign = align === "left" ? "" : align; });
    return row.cells[col];
  });

  const deleteTable = () => tableEdit(({ table }) => { table.remove(); return null; });

  // Tab / Shift+Tab walk the cells; Tab in the last cell adds a row.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (figure) {
      // A selected image: Backspace/Delete removes it; any other key types on.
      if (e.key === "Backspace" || e.key === "Delete") { e.preventDefault(); removeFigure(); return; }
      selectFigure(null);
    }
    if (!tables || e.key !== "Tab" || !cell) return;
    const table = cell.closest("table");
    if (!table) return;
    e.preventDefault();
    const cells = Array.from(table.querySelectorAll("th,td"));
    const i = cells.indexOf(cell);
    const next = cells[i + (e.shiftKey ? -1 : 1)];
    if (next) { focusCell(next); return; }
    if (!e.shiftKey) addRow(true);
  };

  const currentTable = cell?.closest("table") || null;
  const tokens = currentTable ? styleTokens(currentTable) : [];
  const variant = currentTable ? variantOf(currentTable) : "grid";
  const inHead = cell?.parentElement?.parentElement?.tagName === "THEAD";
  const align = cell ? ((cell as HTMLElement).style.textAlign || "left") : "left";
  const activeFigure = figure && ref.current?.contains(figure) ? figure : null;
  const isRow = activeFigure?.dataset.layout === "row";
  const figAlign = activeFigure?.dataset.align || "center";
  const figSize = activeFigure?.dataset.size || "lg";

  return (
    <div ref={wrapRef} className={cn("overflow-hidden rounded-md border border-input bg-background", className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 px-1.5 py-1">
        <Btn disabled={disabled} label="Bold" onClick={() => exec("bold")}><Bold className="h-4 w-4" /></Btn>
        <Btn disabled={disabled} label="Italic" onClick={() => exec("italic")}><Italic className="h-4 w-4" /></Btn>
        <Btn disabled={disabled} label="Underline" onClick={() => exec("underline")}><Underline className="h-4 w-4" /></Btn>
        <Btn disabled={disabled} label="Strikethrough" onClick={() => exec("strikeThrough")}><Strikethrough className="h-4 w-4" /></Btn>
        <Sep />
        <Btn disabled={disabled} label="Heading" onClick={() => exec("formatBlock", "H2")}><Heading2 className="h-4 w-4" /></Btn>
        <Btn disabled={disabled} label="Subheading" onClick={() => exec("formatBlock", "H3")}><Heading3 className="h-4 w-4" /></Btn>
        <Btn disabled={disabled} label="Paragraph" onClick={() => exec("formatBlock", "P")}><Pilcrow className="h-4 w-4" /></Btn>
        <Sep />
        <Btn disabled={disabled} label="Bulleted list" onClick={() => exec("insertUnorderedList")}><List className="h-4 w-4" /></Btn>
        <Btn disabled={disabled} label="Numbered list" onClick={() => exec("insertOrderedList")}><ListOrdered className="h-4 w-4" /></Btn>
        <Btn disabled={disabled} label="Quote" onClick={() => exec("formatBlock", "BLOCKQUOTE")}><Quote className="h-4 w-4" /></Btn>
        <Sep />
        <Btn disabled={disabled} label="Align left" onClick={() => exec("justifyLeft")}><AlignLeft className="h-4 w-4" /></Btn>
        <Btn disabled={disabled} label="Align center" onClick={() => exec("justifyCenter")}><AlignCenter className="h-4 w-4" /></Btn>
        <Btn disabled={disabled} label="Align right" onClick={() => exec("justifyRight")}><AlignRight className="h-4 w-4" /></Btn>
        <Sep />
        <Btn disabled={disabled} label="Link" onClick={link}><LinkIcon className="h-4 w-4" /></Btn>
        {tables && (
          <Popover open={pickerOpen} onOpenChange={(o) => { setPickerOpen(o); if (o) setHover([0, 0]); }}>
            <PopoverTrigger asChild>
              <button type="button" title="Insert table" aria-label="Insert table" disabled={disabled}
                onMouseDown={rememberCaret}
                className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40">
                <TableIcon className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-3">
              <p className="mb-2 text-xs font-medium">
                {hover[0] ? `${hover[0]} × ${hover[1]} table` : "Choose table size"}
              </p>
              <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${PICKER_SIZE}, 1.1rem)` }} onMouseLeave={() => setHover([0, 0])}>
                {Array.from({ length: PICKER_SIZE * PICKER_SIZE }, (_, i) => {
                  const r = Math.floor(i / PICKER_SIZE) + 1;
                  const c = (i % PICKER_SIZE) + 1;
                  const on = r <= hover[0] && c <= hover[1];
                  return (
                    <button key={i} type="button" aria-label={`${r} by ${c}`}
                      onMouseEnter={() => setHover([r, c])}
                      onFocus={() => setHover([r, c])}
                      onClick={() => insertTable(Math.max(r, 2), c)}
                      className={cn("h-[1.1rem] w-[1.1rem] rounded-sm border", on ? "border-primary bg-primary/30" : "border-border bg-background")} />
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">First row is the header. Rows: rows × columns.</p>
            </PopoverContent>
          </Popover>
        )}
        {uploadImage && (
          <>
            <button type="button" title="Insert image(s) — pick several for a side-by-side row" aria-label="Insert image" disabled={disabled || !!uploading}
              onMouseDown={rememberCaret}
              onClick={() => { imageMode.current = "new"; imageInputRef.current?.click(); }}
              className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40">
              <ImagePlus className="h-4 w-4" />
            </button>
            {uploading && (
              <span className="flex items-center gap-1 px-1 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />Uploading {Math.min(uploading.done + 1, uploading.total)}/{uploading.total}
              </span>
            )}
            <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden"
              onChange={(e) => { const f = e.target.files; onImagesPicked(f).finally(() => { e.target.value = ""; }); }} />
            <input ref={replaceInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
              onChange={(e) => { const f = e.target.files; onReplacePicked(f).finally(() => { e.target.value = ""; }); }} />
          </>
        )}
        <Btn disabled={disabled} label="Clear formatting" onClick={() => exec("removeFormat")}><Eraser className="h-4 w-4" /></Btn>
        <Btn disabled={disabled} label="Undo" onClick={() => exec("undo")}><Undo2 className="h-4 w-4" /></Btn>
        <Btn disabled={disabled} label="Redo" onClick={() => exec("redo")}><Redo2 className="h-4 w-4" /></Btn>
      </div>
      {tables && cell && currentTable && (
        <div className="flex flex-wrap items-center gap-x-1 gap-y-1 border-b bg-primary/5 px-2 py-1">
          <span className="mr-1 flex items-center gap-1 text-xs font-semibold text-primary"><TableIcon className="h-3.5 w-3.5" />Table</span>
          <TBtn disabled={disabled} label="+ Row above" onClick={() => addRow(false)} title={inHead ? "Rows are added to the body" : "Insert row above"} />
          <TBtn disabled={disabled} label="+ Row below" onClick={() => addRow(true)} />
          <TBtn disabled={disabled} label="+ Col left" onClick={() => addCol(false)} />
          <TBtn disabled={disabled} label="+ Col right" onClick={() => addCol(true)} />
          <TBtn disabled={disabled} label="− Row" onClick={deleteRow} danger title="Delete this row" />
          <TBtn disabled={disabled} label="− Col" onClick={deleteCol} danger title="Delete this column" />
          <Sep />
          <TBtn disabled={disabled} label="Header row" active={!!currentTable.tHead} onClick={toggleHeader} title="Show the first row as a header" />
          <Sep />
          {VARIANTS.map((v) => (
            <TBtn disabled={disabled} key={v.value} label={v.label} active={variant === v.value} onClick={() => setVariant(v.value)} title={`${v.label} style`} />
          ))}
          <TBtn disabled={disabled} label="Compact" active={tokens.includes("compact")} onClick={() => toggleToken("compact")} title="Tighter cell padding" />
          <TBtn disabled={disabled} label="Fit width" active={tokens.includes("fit")} onClick={() => toggleToken("fit")} title="Shrink to the content instead of full width" />
          <Sep />
          <span className="text-xs text-muted-foreground">Column:</span>
          <TBtn disabled={disabled} label="L" active={align === "left"} onClick={() => alignCol("left")} title="Align column left" />
          <TBtn disabled={disabled} label="C" active={align === "center"} onClick={() => alignCol("center")} title="Align column center" />
          <TBtn disabled={disabled} label="R" active={align === "right"} onClick={() => alignCol("right")} title="Align column right (numbers)" />
          <Sep />
          <button type="button" title="Delete table" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={deleteTable}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-40">
            <Trash2 className="h-3.5 w-3.5" />Delete table
          </button>
        </div>
      )}
      {uploadImage && activeFigure && !disabled && (
        <div className="flex flex-wrap items-center gap-x-1 gap-y-1 border-b bg-primary/5 px-2 py-1">
          <span className="mr-1 flex items-center gap-1 text-xs font-semibold text-primary">
            <ImageIcon className="h-3.5 w-3.5" />{isRow ? "Image row" : "Image"}
          </span>
          {!isRow && (
            <>
              {IMAGE_ALIGNS.map((a) => (
                <TBtn disabled={disabled} key={a.value} label={a.label} title={a.title} active={figAlign === a.value} onClick={() => setImageAlign(a.value)} />
              ))}
              <Sep />
              <span className="text-xs text-muted-foreground">Size:</span>
              {IMAGE_SIZES.map((z) => (
                <TBtn disabled={disabled} key={z.value} label={z.label} title={figAlign === "full" ? "Full width ignores size" : z.title}
                  active={figAlign !== "full" && figSize === z.value} onClick={() => setImageSize(z.value)} />
              ))}
              <Sep />
            </>
          )}
          <input
            value={activeFigure.querySelector("figcaption")?.textContent || ""}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Caption (optional)"
            maxLength={200}
            className="h-6 w-44 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Sep />
          <TBtn disabled={disabled} label="↑ Up" title="Move above the previous block" onClick={() => moveFigure(-1)} />
          <TBtn disabled={disabled} label="↓ Down" title="Move below the next block" onClick={() => moveFigure(1)} />
          <Sep />
          {isRow && (
            <TBtn disabled={disabled} label="+ Add images" title="Add more pictures to this row" onClick={() => { imageMode.current = "append"; imageInputRef.current?.click(); }} />
          )}
          <TBtn disabled={disabled} label="Replace" title={isRow ? "Replace the clicked picture" : "Replace this picture"} onClick={() => replaceInputRef.current?.click()} />
          {isRow && <TBtn disabled={disabled} label="Remove this one" danger title="Remove the clicked picture from the row" onClick={removeRowImage} />}
          <button type="button" title={isRow ? "Remove the whole row" : "Remove image"} onMouseDown={(e) => e.preventDefault()} onClick={removeFigure}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-destructive hover:bg-destructive/10">
            <Trash2 className="h-3.5 w-3.5" />{isRow ? "Remove row" : "Remove"}
          </button>
        </div>
      )}
      <div
        ref={ref}
        onClick={onEditorClick}
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        onKeyDown={onKeyDown}
        onPaste={(e) => {
          // Paste as plain text so pasted Word/web styling doesn't leak in.
          e.preventDefault();
          document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
        }}
        // Only the text scrolls (overscroll-contain stops the wheel from
        // spilling into the dialog/page at either end); the toolbars above stay put.
        className="rich-content rich-editor overflow-auto overscroll-contain px-3 py-2 text-sm focus:outline-none"
        style={{ minHeight, maxHeight }}
      />
    </div>
  );
}

export default RichTextEditor;
