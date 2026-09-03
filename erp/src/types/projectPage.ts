// Shared types for per-project detail pages (ProjectPage model in the API).
import type { PageSection, SectionBackground, SitePageHero } from "./sitePage";

export interface ProjectPageOverview {
  visible: boolean;
  showDates: boolean;
  showProgress: boolean;
  showBeneficiaries: boolean;
  showBudget: boolean;
  showMilestones: boolean;
  /** Swatch name or hex. Empty = brand colour. */
  accentColor?: string;
  background: SectionBackground;
  backgroundColor?: string;
}

export interface ProjectPage {
  _id?: string;
  project: string;
  slug: string;
  status: "draft" | "published";
  summary?: string;
  coverImageUrl?: string;
  coverImageKey?: string;
  hero?: SitePageHero;
  overview: ProjectPageOverview;
  sections: PageSection[];
  seo?: { title?: string; description?: string };
  createdAt?: string;
  updatedAt?: string;
}

/** Slice of the Project record the admin builder and list receive. */
export interface ProjectPageProject {
  _id: string;
  name: string;
  code?: string;
  description?: string;
  category?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

/** Row of the admin list: every project with its page (null until built). */
export interface ProjectPageRow {
  project: ProjectPageProject;
  page: Pick<ProjectPage, "_id" | "slug" | "status" | "coverImageUrl" | "updatedAt"> | null;
}

/** Public detail payload: the published page plus the public slice of its project. */
export interface PublicProjectDetail {
  page: ProjectPage;
  project: ProjectPageProject & {
    progress?: {
      percentage?: number;
      milestones?: Array<{ _id?: string; name?: string; description?: string; targetDate?: string; completedDate?: string; status?: string }>;
    };
    targetBeneficiaries?: { estimated?: number; actual?: number };
    budget?: { total?: number; spent?: number; currency?: string };
  };
}

/** Projects the public site shows; other statuses get a warning in the builder. */
export const PUBLIC_PROJECT_STATUSES = ["active", "approved", "completed"];

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  approved: "Approved",
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function emptyProjectPage(project: ProjectPageProject): ProjectPage {
  return {
    project: project._id,
    slug: "",
    status: "draft",
    summary: "",
    coverImageUrl: "",
    coverImageKey: "",
    hero: { title: "", subtitle: "", imageUrl: "", imageKey: "" },
    overview: {
      visible: true,
      showDates: true,
      showProgress: true,
      showBeneficiaries: true,
      showBudget: false,
      showMilestones: false,
      accentColor: "",
      background: "muted",
      backgroundColor: "",
    },
    sections: [],
    seo: { title: "", description: "" },
  };
}
