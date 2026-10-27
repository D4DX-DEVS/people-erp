// "Get Involved" header menu: its default sub-pages and the helpers the
// Website Pages screen uses to manage the dropdown in WebsiteSettings.navigation.
import type { PageSection, SitePage } from "@/types/sitePage";
import type { NavItem, NavLink, NavigationSettings } from "@/types/siteNavigation";

/** Stable key of the dropdown on the stored nav item (survives renaming its label). */
export const GET_INVOLVED_KEY = "get-involved";

const CONTACT_PATH = "/p/contact-us";

type DefaultPage = Pick<SitePage, "title" | "slug" | "navLabel" | "summary" | "hero" | "sections" | "seo">;

const section = (s: Partial<PageSection> & Pick<PageSection, "type">, order: number): PageSection => ({ ...s, order });

/**
 * Starter content for the Get Involved pages. Deliberately general: it states
 * how to take part, never a fact the organisation would have to check (dates,
 * stipends, head-counts). Admins rewrite it in the page builder.
 */
export const GET_INVOLVED_DEFAULT_PAGES: DefaultPage[] = [
  {
    title: "Volunteering",
    slug: "volunteering",
    navLabel: "Volunteering",
    summary: "Give your time and skills to the communities we serve.",
    seo: { title: "Volunteer With Us", description: "Join our volunteers and help communities on the ground, at events or online." },
    hero: { title: "Volunteer With Us", subtitle: "Give your time and skills to the communities that need them most." },
    sections: [
      section({
        type: "richtext",
        title: "Why volunteer?",
        icon: "hand-heart",
        content:
          "<p>Volunteers are at the heart of everything we do. Whether you can give a few hours a month or a few days a week, your time helps families access care, education and opportunity.</p><p>You don't need special experience to start — just the willingness to listen, learn and lend a hand. We'll match you with work that fits your interests and availability.</p>",
      }, 0),
      section({
        type: "cards",
        title: "Ways to help",
        subtitle: "Pick what suits you — you can always try something new later.",
        columns: 4,
        background: "muted",
        items: [
          { icon: "hand-heart", title: "Field volunteering", description: "Support our teams on the ground during surveys, distributions, camps and home visits." },
          { icon: "briefcase", title: "Skilled volunteering", description: "Lend your professional skills — medicine, teaching, law, finance, design, technology and more." },
          { icon: "megaphone", title: "Events & campaigns", description: "Help organise awareness programmes, fundraisers and community gatherings." },
          { icon: "globe", title: "Online support", description: "Contribute remotely with content, translation, research or outreach." },
        ],
      }, 1),
      section({
        type: "timeline",
        title: "How it works",
        items: [
          { value: "Step 1", title: "Reach out", description: "Tell us a little about yourself and the kind of work you'd like to do." },
          { value: "Step 2", title: "Orientation", description: "We introduce you to our work, our values and how volunteers are supported." },
          { value: "Step 3", title: "Get matched", description: "We connect you with a project or activity that fits your skills and time." },
          { value: "Step 4", title: "Make an impact", description: "Start volunteering, with a coordinator to guide you along the way." },
        ],
      }, 2),
      section({
        type: "cta",
        title: "Ready to make a difference?",
        content: "Get in touch and our volunteer coordinator will help you find the right place to start.",
        ctaText: "Contact Us",
        ctaLink: CONTACT_PATH,
      }, 3),
    ],
  },
  {
    title: "Internship",
    slug: "internship",
    navLabel: "Internship",
    summary: "Learn by doing alongside teams working on real community programmes.",
    seo: { title: "Internship Programme", description: "Internships for students and young professionals in programmes, research, communications and administration." },
    hero: { title: "Internship Programme", subtitle: "Learn by doing alongside teams working on real community programmes." },
    sections: [
      section({
        type: "richtext",
        title: "Learn while you contribute",
        icon: "graduation-cap",
        content:
          "<p>Our internship programme is for students and young professionals who want hands-on experience in the development sector. Interns work on live projects with guidance from experienced staff, and leave with practical skills and a deeper understanding of community work.</p>",
      }, 0),
      section({
        type: "cards",
        title: "Internship areas",
        columns: 3,
        background: "muted",
        items: [
          { icon: "sprout", title: "Programmes & field work", description: "Assist with project planning, field visits, beneficiary follow-up and reporting." },
          { icon: "book-open", title: "Research & documentation", description: "Support studies, surveys, impact assessments and case documentation." },
          { icon: "camera", title: "Communications & media", description: "Create stories, photos, videos and social media content about our work." },
          { icon: "wallet", title: "Finance & administration", description: "Learn how a non-profit manages budgets, compliance and operations." },
          { icon: "lightbulb", title: "Technology", description: "Help improve the digital tools and systems that support our programmes." },
          { icon: "users", title: "Community outreach", description: "Work with volunteers and local partners to reach more families." },
        ],
      }, 1),
      section({
        type: "cards",
        title: "What you gain",
        columns: 3,
        items: [
          { icon: "compass", title: "Mentorship", description: "Regular guidance from a supervisor in your area of work." },
          { icon: "target", title: "Real responsibility", description: "Meaningful tasks on ongoing projects, not just observation." },
          { icon: "award", title: "Certificate", description: "A certificate of completion recognising your contribution." },
        ],
      }, 2),
      section({
        type: "faq",
        title: "Common questions",
        items: [
          { title: "Who can apply?", description: "Students and recent graduates from any discipline who are interested in social impact." },
          { title: "How long is an internship?", description: "Duration and schedule are agreed with each intern based on the programme and their availability." },
          { title: "How do I apply?", description: "Contact us with your CV, your area of interest and the dates you are available. We'll get back to you about current openings." },
        ],
      }, 3),
      section({
        type: "cta",
        title: "Interested in interning with us?",
        content: "Send us your CV and the area you'd like to work in.",
        ctaText: "Contact Us",
        ctaLink: CONTACT_PATH,
      }, 4),
    ],
  },
  {
    title: "Careers",
    slug: "career",
    navLabel: "Career",
    summary: "Build a career with purpose — work that changes lives.",
    seo: { title: "Careers", description: "Join our team and build a career in community development and social impact." },
    hero: { title: "Careers", subtitle: "Build a career with purpose — work that changes lives." },
    sections: [
      section({
        type: "richtext",
        title: "Work with us",
        icon: "briefcase",
        content:
          "<p>We are always looking for committed people who want their work to make a difference — in the field, in our offices and in the communities we serve.</p>",
      }, 0),
      section({
        type: "cards",
        title: "Why join us",
        columns: 3,
        background: "muted",
        items: [
          { icon: "heart", title: "Purpose-driven work", description: "Every role contributes directly to improving lives in our communities." },
          { icon: "trending-up", title: "Grow with us", description: "Learn across programmes and take on more responsibility as you grow." },
          { icon: "users", title: "Collaborative team", description: "Work alongside people who share your values and support each other." },
        ],
      }, 1),
      section({
        type: "richtext",
        title: "Current openings",
        icon: "calendar",
        content:
          "<p>Open positions are announced on this page as they become available.</p><p>Don't see a role that matches your profile? You can still send us your CV — we keep promising profiles on file and reach out when a suitable opportunity opens up.</p>",
      }, 2),
      section({
        type: "cta",
        title: "Send us your CV",
        content: "Tell us about yourself and the kind of role you're looking for.",
        ctaText: "Contact Us",
        ctaLink: CONTACT_PATH,
      }, 3),
    ],
  },
  {
    title: "Contact Us",
    slug: "contact-us",
    navLabel: "Contact Us",
    summary: "Reach our team — we're happy to help.",
    seo: { title: "Contact Us", description: "Get in touch with our team." },
    hero: { title: "Contact Us", subtitle: "We'd love to hear from you." },
    sections: [section({ type: "contact", title: "Get in touch" }, 0)],
  },
];

export const pagePath = (slug: string) => `/p/${slug}`;

/** The stored Get Involved dropdown: by key first, then by label for menus saved before keys existed. */
export function findGetInvolved(items: NavItem[]): number {
  const byKey = items.findIndex((i) => i.key === GET_INVOLVED_KEY);
  if (byKey >= 0) return byKey;
  return items.findIndex((i) => /^get\s*involved$/i.test((i.label || "").trim()));
}

/** A fresh Get Involved dropdown pointing at the default pages. */
export function defaultGetInvolvedItem(): NavItem {
  return {
    type: "dropdown",
    key: GET_INVOLVED_KEY,
    label: "Get Involved",
    kind: "page",
    target: CONTACT_PATH,
    visible: true,
    children: GET_INVOLVED_DEFAULT_PAGES.map((p): NavLink => ({
      label: p.navLabel || p.title,
      kind: "page",
      target: pagePath(p.slug),
      visible: true,
    })),
  };
}

/** Navigation with the Get Involved dropdown replaced (or appended when missing). */
export function withGetInvolved(nav: NavigationSettings, item: NavItem): NavigationSettings {
  const items = nav.items.slice();
  const at = findGetInvolved(items);
  const next = { ...item, key: GET_INVOLVED_KEY, type: "dropdown" as const };
  if (at >= 0) items[at] = next;
  else items.push(next);
  return { ...nav, customized: true, items };
}
