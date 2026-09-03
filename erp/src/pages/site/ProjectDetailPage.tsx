import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteShell, PageHero } from "@/components/site/SiteShell";
import { PageSections, SectionBlock } from "@/components/site/PageSections";
import { usePublicProjectPage } from "@/hooks/useSitePages";
import { categoryLabel } from "@/lib/siteProjects";
import type { PageSection, SectionItem } from "@/types/sitePage";
import { type PublicProjectDetail, PROJECT_STATUS_LABELS } from "@/types/projectPage";

const monthYear = (d?: string) =>
  d ? new Date(d).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "";

const money = (amount?: number, currency?: string) => {
  if (amount === undefined || amount === null) return "";
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: currency || "INR", maximumFractionDigits: 0 }).format(amount);
  } catch {
    return String(amount);
  }
};

/**
 * The automatic "at a glance" block: description + live facts from the
 * project record, rendered through the same section blocks as the builder so
 * icons, accent colour and background match the rest of the page.
 */
function overviewSections({ page, project }: PublicProjectDetail): PageSection[] {
  const ov = page.overview;
  if (!ov?.visible) return [];
  const style = { accentColor: ov.accentColor, background: ov.background, backgroundColor: ov.backgroundColor };

  const facts: SectionItem[] = [
    { icon: "layers", title: "Category", value: categoryLabel(project.category) },
    { icon: "badge-check", title: "Status", value: PROJECT_STATUS_LABELS[project.status || ""] || project.status || "" },
  ];
  if (ov.showDates && (project.startDate || project.endDate)) {
    facts.push({ icon: "calendar", title: "Timeline", value: [monthYear(project.startDate), monthYear(project.endDate)].filter(Boolean).join(" – ") });
  }
  if (ov.showProgress && project.progress?.percentage !== undefined) {
    facts.push({ icon: "trending-up", title: "Progress", value: `${project.progress.percentage}%` });
  }
  if (ov.showBeneficiaries && project.targetBeneficiaries?.estimated) {
    const { actual = 0, estimated } = project.targetBeneficiaries;
    facts.push({ icon: "users", title: "Beneficiaries", value: actual ? `${actual} / ${estimated}` : `${estimated}` });
  }
  if (ov.showBudget && project.budget?.total !== undefined) {
    facts.push({ icon: "wallet", title: "Budget", value: money(project.budget.total, project.budget.currency) });
    if (project.budget.spent) facts.push({ icon: "coins", title: "Spent", value: money(project.budget.spent, project.budget.currency) });
  }

  const sections: PageSection[] = [];
  if (project.description?.trim()) {
    sections.push({ type: "richtext", title: "About this project", content: project.description, ...style, order: 0 });
  }
  sections.push({ type: "stats", title: sections.length ? "" : "At a glance", items: facts, columns: Math.min(4, facts.length), ...style, order: 1 });

  const milestones = ov.showMilestones ? project.progress?.milestones || [] : [];
  if (milestones.length) {
    sections.push({
      type: "timeline",
      title: "Milestones",
      icon: "flag",
      accentColor: ov.accentColor,
      background: "default",
      order: 2,
      items: milestones.map((m) => ({
        value: monthYear(m.completedDate || m.targetDate),
        title: m.name,
        description: [m.description, m.status ? `Status: ${m.status.replace(/_/g, " ")}` : ""].filter(Boolean).join("\n"),
      })),
    });
  }
  return sections;
}

export default function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = usePublicProjectPage(slug);

  useEffect(() => {
    if (data) document.title = data.page.seo?.title || data.project.name;
  }, [data]);

  if (isLoading) return <SiteShell loading />;

  if (!data) {
    return (
      <SiteShell>
        <div className="container mx-auto flex flex-col items-center justify-center gap-4 px-4 py-32 text-center">
          <Sparkles className="h-12 w-12 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Project not found</h1>
          <p className="max-w-md text-muted-foreground">This project page doesn't exist or is no longer available.</p>
          <Button className="rounded-full" onClick={() => navigate("/projects-hub")}>All projects</Button>
        </div>
      </SiteShell>
    );
  }

  const { page, project } = data;

  return (
    <SiteShell>
      <PageHero title={page.hero?.title || project.name} subtitle={page.hero?.subtitle} imageUrl={page.hero?.imageUrl || page.coverImageUrl} />
      {overviewSections(data).map((s) => (
        <SectionBlock key={`overview-${s.order}`} section={s} />
      ))}
      <PageSections sections={page.sections} />
      <div className="container mx-auto px-4 pb-16 text-center">
        <Button variant="outline" className="rounded-full" onClick={() => navigate("/projects-hub")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> All projects
        </Button>
      </div>
    </SiteShell>
  );
}
