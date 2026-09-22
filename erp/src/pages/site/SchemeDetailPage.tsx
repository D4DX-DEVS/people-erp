import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteShell, PageHero, PageBody } from "@/components/site/SiteShell";
import { SiteBreadcrumbs } from "@/components/site/SiteBreadcrumbs";
import { PageSections, SectionBlock } from "@/components/site/PageSections";
import { usePublicSchemePage } from "@/hooks/useSitePages";
import { schemeTheme } from "@/config/schemeThemes";
import type { PageSection, SectionItem } from "@/types/sitePage";
import {
  type PublicSchemeDetail, BENEFIT_TYPE_LABELS, BENEFIT_FREQUENCY_LABELS,
} from "@/types/schemePage";

const dateLabel = (d?: string) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";

const money = (amount?: number, currency?: string) => {
  if (amount === undefined || amount === null) return "";
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: currency || "INR", maximumFractionDigits: 0 }).format(amount);
  } catch {
    return String(amount);
  }
};

const sentence = (v?: string) => (v ? v.replace(/_/g, " ") : "");

/** Eligibility rules, phrased as readable lines rather than raw field values. */
function eligibilityItems({ scheme }: PublicSchemeDetail): SectionItem[] {
  const e = scheme.eligibility;
  if (!e) return [];
  const items: SectionItem[] = [];

  const { min, max } = e.ageRange || {};
  if (min !== undefined || max !== undefined) {
    const value = min !== undefined && max !== undefined ? `${min} – ${max} years`
      : min !== undefined ? `${min} years and above`
      : `Up to ${max} years`;
    items.push({ icon: "calendar", title: "Age", description: value });
  }
  if (e.gender && e.gender !== "any") {
    items.push({ icon: "users", title: "Gender", description: sentence(e.gender) });
  }
  if (e.incomeLimit) {
    items.push({ icon: "wallet", title: "Income limit", description: `Household income up to ${money(e.incomeLimit)}` });
  }
  const fam = e.familySize || {};
  if (fam.min !== undefined || fam.max !== undefined) {
    const value = fam.min !== undefined && fam.max !== undefined ? `${fam.min} – ${fam.max} members`
      : fam.min !== undefined ? `${fam.min} members or more`
      : `Up to ${fam.max} members`;
    items.push({ icon: "home", title: "Family size", description: value });
  }
  if (e.educationLevel && e.educationLevel !== "any") {
    items.push({ icon: "graduation-cap", title: "Education", description: sentence(e.educationLevel) });
  }
  if (e.employmentStatus && e.employmentStatus !== "any") {
    items.push({ icon: "briefcase", title: "Employment", description: sentence(e.employmentStatus) });
  }
  return items;
}

/**
 * The automatic "at a glance" blocks: description, live facts from the scheme
 * record, eligibility and documents. Rendered through the same section blocks
 * as the builder so icons, accent colour and background match the rest of the
 * page — the same approach as ProjectDetailPage's overviewSections().
 */
function overviewSections(data: PublicSchemeDetail): PageSection[] {
  const { page, scheme } = data;
  const ov = page.overview;
  if (!ov?.visible) return [];
  const style = { accentColor: ov.accentColor, background: ov.background, backgroundColor: ov.backgroundColor };

  const facts: SectionItem[] = [];
  if (ov.showCategory && scheme.category) {
    facts.push({ icon: "layers", title: "Category", value: sentence(scheme.category) });
  }
  const benefit = scheme.benefits;
  if (benefit?.type) {
    // A stat tile renders `value` large with `title` as its caption and ignores
    // `description`, so the amount is the value and the kind/frequency becomes
    // the caption — "₹25,000" over "Cash assistance · Monthly".
    const amount = benefit.amount ? money(benefit.amount) : "";
    const kind = BENEFIT_TYPE_LABELS[benefit.type] || sentence(benefit.type);
    const freq = benefit.frequency ? BENEFIT_FREQUENCY_LABELS[benefit.frequency] || sentence(benefit.frequency) : "";
    facts.push({
      icon: "hand-heart",
      value: amount || kind,
      title: amount
        ? [kind, freq].filter(Boolean).join(" · ")
        : ["Benefit", freq].filter(Boolean).join(" · "),
    });
  }
  if (ov.showDates && scheme.applicationSettings?.endDate) {
    facts.push({ icon: "calendar", title: "Apply before", value: dateLabel(scheme.applicationSettings.endDate) });
  }
  if (ov.showBeneficiaries) {
    const reached = scheme.statistics?.totalBeneficiaries;
    const target = scheme.applicationSettings?.maxBeneficiaries;
    if (reached || target) {
      facts.push({
        icon: "users",
        title: "Beneficiaries",
        value: reached && target ? `${reached} / ${target}` : String(reached || target),
      });
    }
  }
  if (ov.showBudget && scheme.budget?.total !== undefined) {
    facts.push({ icon: "wallet", title: "Budget", value: money(scheme.budget.total, scheme.budget.currency) });
  }

  const sections: PageSection[] = [];
  if (scheme.description?.trim()) {
    sections.push({ type: "richtext", title: "About this scheme", content: scheme.description, ...style, order: 0 });
  }
  if (facts.length) {
    sections.push({ type: "stats", title: sections.length ? "" : "At a glance", items: facts, columns: Math.min(4, facts.length), ...style, order: 1 });
  }

  const rules = ov.showEligibility ? eligibilityItems(data) : [];
  if (rules.length) {
    sections.push({
      type: "cards",
      title: "Who can apply",
      subtitle: "Applications are checked against these conditions during verification.",
      items: rules,
      columns: Math.min(3, rules.length),
      accentColor: ov.accentColor,
      background: "default",
      order: 2,
    });
  }

  const documents = ov.showDocuments ? scheme.eligibility?.documents || [] : [];
  if (documents.length) {
    sections.push({
      type: "cards",
      title: "Documents to keep ready",
      items: documents.map((d) => ({
        icon: "file-text",
        title: sentence(d.type) || "Document",
        description: [d.description, d.required === false ? "Optional" : "Required"].filter(Boolean).join(" · "),
      })),
      columns: Math.min(3, documents.length),
      accentColor: ov.accentColor,
      background: "muted",
      order: 3,
    });
  }
  return sections;
}

export default function SchemeDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = usePublicSchemePage(slug);

  useEffect(() => {
    if (data) document.title = data.page.seo?.title || data.scheme.name || "Scheme";
  }, [data]);

  if (isLoading) return <SiteShell loading />;

  if (!data) {
    return (
      <SiteShell>
        <div className="container mx-auto flex flex-col items-center justify-center gap-4 px-4 py-24 text-center">
          <Sparkles className="h-12 w-12 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Scheme not found</h1>
          <p className="max-w-md text-muted-foreground">This scheme doesn't exist or is no longer accepting applications.</p>
          <Button className="rounded-full" onClick={() => navigate("/schemes")}>All schemes</Button>
        </div>
      </SiteShell>
    );
  }

  const { page, scheme } = data;
  const name = scheme.name || scheme.title || "Scheme";
  const theme = schemeTheme(scheme.category);

  return (
    <SiteShell>
      {/* Same artwork and summary the scheme's card carries on the home page
          and the archive, so the detail page opens on what was clicked. */}
      <PageHero
        title={page.hero?.title || name}
        subtitle={page.hero?.subtitle || page.summary}
        imageUrl={page.hero?.imageUrl || page.coverImageUrl || scheme.imageUrl || theme.image}
      />
      <SiteBreadcrumbs items={[{ label: "Schemes", href: "/schemes" }, { label: page.hero?.title || name }]} />
      {/* flush: the section blocks carry their own padding and their own
          full-width background bands, which have to reach the card's edges. */}
      <PageBody flush>
        {overviewSections(data).map((s) => (
          <SectionBlock key={`overview-${s.order}`} section={s} />
        ))}
        <PageSections sections={page.sections} />

        <section className="container mx-auto px-4 pb-10 text-center">
          <Button
            size="lg"
            className="rounded-full px-8 shadow-lg"
            onClick={() => navigate("/beneficiary-login")}
          >
            Apply for this scheme <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="mt-3 text-sm text-muted-foreground">
            You'll be asked to sign in or register before starting an application.
          </p>
          <Button variant="outline" className="mt-6 rounded-full" onClick={() => navigate("/schemes")}>
            <ArrowLeft className="mr-1 h-4 w-4" /> All schemes
          </Button>
        </section>
      </PageBody>
    </SiteShell>
  );
}
