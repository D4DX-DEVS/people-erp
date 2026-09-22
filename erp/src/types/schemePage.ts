// Shared types for per-scheme detail pages (SchemePage model in the API).
import type { PageSection, SectionBackground, SitePageHero } from "./sitePage";

export interface SchemePageOverview {
  visible: boolean;
  showCategory: boolean;
  showBudget: boolean;
  showBeneficiaries: boolean;
  showDates: boolean;
  showEligibility: boolean;
  showDocuments: boolean;
  /** Swatch name or hex. Empty = brand colour. */
  accentColor?: string;
  background: SectionBackground;
  backgroundColor?: string;
}

export interface SchemePage {
  _id?: string;
  scheme: string;
  slug: string;
  status: "draft" | "published";
  summary?: string;
  coverImageUrl?: string;
  coverImageKey?: string;
  hero?: SitePageHero;
  overview: SchemePageOverview;
  sections: PageSection[];
  seo?: { title?: string; description?: string };
  /** Set by the API when the page was generated from the scheme record alone. */
  generated?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Slice of the Scheme record the admin builder and list receive. */
export interface SchemePageScheme {
  _id: string;
  name: string;
  /** Legacy alias some older records/UI still read. */
  title?: string;
  code?: string;
  description?: string;
  category?: string;
  status?: string;
  imageUrl?: string;
}

/** Row of the admin list: every scheme with its page (null until built). */
export interface SchemePageRow {
  scheme: SchemePageScheme;
  page: Pick<SchemePage, "_id" | "slug" | "status" | "coverImageUrl" | "updatedAt"> | null;
  /** The public URL the scheme resolves to today, built page or not. */
  defaultSlug: string;
}

/** Public detail payload: the page (real or generated) plus the public scheme slice. */
export interface PublicSchemeDetail {
  page: SchemePage;
  scheme: SchemePageScheme & {
    benefits?: { type?: string; amount?: number; frequency?: string; duration?: number; description?: string };
    budget?: { total?: number; allocated?: number; currency?: string };
    statistics?: { totalBeneficiaries?: number };
    applicationSettings?: { startDate?: string; endDate?: string; maxBeneficiaries?: number };
    eligibility?: {
      ageRange?: { min?: number; max?: number };
      gender?: string;
      incomeLimit?: number;
      familySize?: { min?: number; max?: number };
      educationLevel?: string;
      employmentStatus?: string;
      documents?: Array<{ type?: string; required?: boolean; description?: string }>;
    };
  };
}

/** Schemes the public site shows; other statuses get a warning in the builder. */
export const PUBLIC_SCHEME_STATUSES = ["active"];

export const SCHEME_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  inactive: "Inactive",
  suspended: "Suspended",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const BENEFIT_TYPE_LABELS: Record<string, string> = {
  cash: "Cash assistance",
  kind: "In-kind support",
  service: "Service",
  scholarship: "Scholarship",
  loan: "Loan",
  subsidy: "Subsidy",
};

export const BENEFIT_FREQUENCY_LABELS: Record<string, string> = {
  one_time: "One time",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export function emptySchemePage(scheme: SchemePageScheme): SchemePage {
  return {
    scheme: scheme._id,
    slug: "",
    status: "draft",
    summary: "",
    coverImageUrl: "",
    coverImageKey: "",
    hero: { title: "", subtitle: "", imageUrl: "", imageKey: "" },
    overview: {
      visible: true,
      showCategory: true,
      showBudget: false,
      showBeneficiaries: true,
      showDates: true,
      showEligibility: true,
      showDocuments: true,
      accentColor: "",
      background: "muted",
      backgroundColor: "",
    },
    sections: [],
    seo: { title: "", description: "" },
  };
}
