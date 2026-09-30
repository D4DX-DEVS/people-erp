import { cn } from "@/lib/utils";
import { isHtml, sanitizeHtml } from "@/lib/richText";

/**
 * Renders a body written in the admin rich-text editor. Legacy plain-text
 * bodies (no markup) keep their paragraph/line-break behaviour.
 */
export function RichContent({ content, className, style }: { content?: string; className?: string; style?: React.CSSProperties }) {
  if (!content?.trim()) return null;
  if (!isHtml(content)) {
    return (
      <div className={className} style={style}>
        {content.split(/\n\s*\n/).map((p, i) => <p key={i} className="mb-4 whitespace-pre-line leading-relaxed">{p}</p>)}
      </div>
    );
  }
  return <div className={cn("rich-content", className)} style={style} dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />;
}
