import { useEffect, useRef, useState } from "react";
import {
  Bold, Italic, Underline, Strikethrough, Heading2, Heading3, List, ListOrdered, Quote,
  AlignLeft, AlignCenter, AlignRight, Link as LinkIcon, Eraser, Undo2, Redo2, Pilcrow, Table as TableIcon, Trash2,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  /** Offer the table tool: insert a table, then add/remove rows and columns, header row, style and alignment. */
  tables?: boolean;
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

/** Lightweight WYSIWYG editor (bold, italic, headings, lists, alignment, links, optional tables). Stores HTML. */
export function RichTextEditor({ value, onChange, placeholder, minHeight = 160, disabled, className, tables }: Props) {
  const ref = useRef<HTMLDivElement>(null);
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
    last.current = value;
  }, [value]);

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
    const html = ref.current.innerHTML;
    const empty = !ref.current.textContent?.trim() && !/<(ul|ol|hr|table)/i.test(html);
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

  const Btn = ({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) => (
    <button type="button" title={label} aria-label={label} disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40">
      {children}
    </button>
  );
  const Sep = () => <span className="mx-1 h-5 w-px bg-border" />;
  /** Text button for the table bar; keeps the editor selection on click. */
  const TBtn = ({ label, onClick, active, danger, title }: { label: string; onClick: () => void; active?: boolean; danger?: boolean; title?: string }) => (
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

  const currentTable = cell?.closest("table") || null;
  const tokens = currentTable ? styleTokens(currentTable) : [];
  const variant = currentTable ? variantOf(currentTable) : "grid";
  const inHead = cell?.parentElement?.parentElement?.tagName === "THEAD";
  const align = cell ? ((cell as HTMLElement).style.textAlign || "left") : "left";

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
        <Btn label="Clear formatting" onClick={() => exec("removeFormat")}><Eraser className="h-4 w-4" /></Btn>
        <Btn label="Undo" onClick={() => exec("undo")}><Undo2 className="h-4 w-4" /></Btn>
        <Btn label="Redo" onClick={() => exec("redo")}><Redo2 className="h-4 w-4" /></Btn>
      </div>
      {tables && cell && currentTable && (
        <div className="flex flex-wrap items-center gap-x-1 gap-y-1 border-b bg-primary/5 px-2 py-1">
          <span className="mr-1 flex items-center gap-1 text-xs font-semibold text-primary"><TableIcon className="h-3.5 w-3.5" />Table</span>
          <TBtn label="+ Row above" onClick={() => addRow(false)} title={inHead ? "Rows are added to the body" : "Insert row above"} />
          <TBtn label="+ Row below" onClick={() => addRow(true)} />
          <TBtn label="+ Col left" onClick={() => addCol(false)} />
          <TBtn label="+ Col right" onClick={() => addCol(true)} />
          <TBtn label="− Row" onClick={deleteRow} danger title="Delete this row" />
          <TBtn label="− Col" onClick={deleteCol} danger title="Delete this column" />
          <Sep />
          <TBtn label="Header row" active={!!currentTable.tHead} onClick={toggleHeader} title="Show the first row as a header" />
          <Sep />
          {VARIANTS.map((v) => (
            <TBtn key={v.value} label={v.label} active={variant === v.value} onClick={() => setVariant(v.value)} title={`${v.label} style`} />
          ))}
          <TBtn label="Compact" active={tokens.includes("compact")} onClick={() => toggleToken("compact")} title="Tighter cell padding" />
          <TBtn label="Fit width" active={tokens.includes("fit")} onClick={() => toggleToken("fit")} title="Shrink to the content instead of full width" />
          <Sep />
          <span className="text-xs text-muted-foreground">Column:</span>
          <TBtn label="L" active={align === "left"} onClick={() => alignCol("left")} title="Align column left" />
          <TBtn label="C" active={align === "center"} onClick={() => alignCol("center")} title="Align column center" />
          <TBtn label="R" active={align === "right"} onClick={() => alignCol("right")} title="Align column right (numbers)" />
          <Sep />
          <button type="button" title="Delete table" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={deleteTable}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-40">
            <Trash2 className="h-3.5 w-3.5" />Delete table
          </button>
        </div>
      )}
      <div
        ref={ref}
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
        className="rich-content rich-editor overflow-x-auto px-3 py-2 text-sm focus:outline-none"
        style={{ minHeight }}
      />
    </div>
  );
}

export default RichTextEditor;
