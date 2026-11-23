import { Fragment, useEffect, type ReactNode } from "react";
import { SiteShell, PageHero, PageBody } from "@/components/site/SiteShell";
import { SiteBreadcrumbs } from "@/components/site/SiteBreadcrumbs";

/**
 * One block of a legal document's section:
 *  - a string is a paragraph;
 *  - `list` is a bulleted (or, with `ordered`, numbered) list;
 *  - `term` is a paragraph led by a bold label ("4.1 Voluntary contributions.").
 */
export type LegalBlock = string | { list: string[]; ordered?: boolean } | { term: string; text: string };

export interface LegalSection {
  title: string;
  blocks: LegalBlock[];
}

// Emails, +91 phone numbers and http(s) links inside the copy become clickable.
// The URL pattern stops at the domain so a sentence-ending full stop is not
// swallowed into the link.
const LINK_PATTERN = /([\w.+-]+@[\w-]+(?:\.[\w-]+)+|\+91[\d-]{10,13}|https?:\/\/[\w-]+(?:\.[\w-]+)+)/g;

function linkify(text: string): ReactNode {
  return text.split(LINK_PATTERN).map((part, i) => {
    if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
    const href = part.includes("@")
      ? `mailto:${part}`
      : part.startsWith("+")
        ? `tel:${part.replace(/-/g, "")}`
        : part;
    const external = href.startsWith("http");
    return (
      <a
        key={i}
        href={href}
        className="text-primary [overflow-wrap:anywhere] hover:underline"
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {part}
      </a>
    );
  });
}

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === "string") return <p>{linkify(block)}</p>;
  if ("term" in block) {
    return (
      <p>
        <strong className="text-foreground">{block.term}</strong> {linkify(block.text)}
      </p>
    );
  }
  const ListTag = block.ordered ? "ol" : "ul";
  return (
    <ListTag className={`ml-5 space-y-2 ${block.ordered ? "list-decimal" : "list-disc"}`}>
      {block.list.map((item, i) => (
        <li key={i}>{linkify(item)}</li>
      ))}
    </ListTag>
  );
}

/** Public page shell for a static legal document (terms, refund policy, …). */
export function LegalDocument({
  title,
  subtitle,
  meta,
  sections,
}: {
  title: string;
  subtitle: string;
  /** Small line under the body heading, e.g. website + last-updated date. */
  meta: string;
  sections: LegalSection[];
}) {
  // Start at the top when arriving from a footer link (same as PrivacyPolicy).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [title]);

  return (
    <SiteShell>
      <PageHero title={title} subtitle={subtitle} />
      <SiteBreadcrumbs items={[{ label: title }]} />
      <PageBody className="mx-auto max-w-3xl">
        <p className="mb-8 border-b border-border/60 pb-4 text-sm text-muted-foreground">{linkify(meta)}</p>
        <div className="space-y-8 leading-relaxed text-muted-foreground">
          {sections.map((section) => (
            <section key={section.title} className="space-y-3">
              <h2 className="text-xl font-bold text-foreground">{section.title}</h2>
              {section.blocks.map((block, i) => (
                <Block key={i} block={block} />
              ))}
            </section>
          ))}
        </div>
      </PageBody>
    </SiteShell>
  );
}
