import type { Task } from "./types";

// Starting plan, 3 Oct 2026.
// 1) Requests to Wall Street English: what Clicksalesmedia needs from the client now.
// 2) Gaps from the audits already delivered, to be fixed by Clicksalesmedia.

type Seed = Omit<Task, "notes" | "dependsOn" | "tags" | "checklist" | "assignees"> & {
  notes?: string;
  dependsOn?: string[];
  tags?: string[];
  checklist?: (string | [string, boolean])[];
};

const REQ = "Request to WSE";

const seed: Seed[] = [
  // Requests to WSE
  {
    id: "r00", title: "Sign the service agreement", system: "program", status: "waiting", phase: "discovery", priority: "critical",
    team: "wse", start: "2026-10-01", due: "2026-10-05", tags: [REQ],
    notes: "The initial term (1 Oct to 31 Dec 2026) starts once the agreement is signed.",
    checklist: ["Agreement reviewed by WSE", "Signed by WSE", "Countersigned by Clicksalesmedia", "First monthly invoice issued"],
  },
  {
    id: "r01", title: "Google Ads account access", system: "ads", status: "done", phase: "discovery", priority: "high",
    team: "wse", start: "2026-09-28", due: "2026-09-30", tags: [REQ, "Access"],
    checklist: [["Admin access granted", true], ["Linked to the Clicksalesmedia manager account", true]],
  },
  {
    id: "r02", title: "Meta Ads account access", system: "ads", status: "done", phase: "discovery", priority: "high",
    team: "wse", start: "2026-09-28", due: "2026-10-01", tags: [REQ, "Access"],
    checklist: [["Partner access in Business Manager", true], ["Ad account and pages access", true]],
  },
  {
    id: "r03", title: "Snapchat Ads account access", system: "ads", status: "waiting", phase: "discovery", priority: "medium",
    team: "wse", start: "2026-10-01", due: "2026-10-07", tags: [REQ, "Access"],
    notes: "Pending from WSE.",
    checklist: ["Snapchat Business account (existing or new)", "Clicksalesmedia added as admin", "Snap Pixel access"],
  },
  {
    id: "r04", title: "TikTok Ads account access", system: "ads", status: "waiting", phase: "discovery", priority: "medium",
    team: "wse", start: "2026-10-01", due: "2026-10-07", tags: [REQ, "Access"],
    notes: "Pending from WSE.",
    checklist: ["TikTok Business Center account (existing or new)", "Clicksalesmedia added as partner or admin", "TikTok Pixel access"],
  },
  {
    id: "r05", title: "WhatsApp Business API from the provider", system: "whatsapp", status: "todo", phase: "discovery", priority: "critical",
    team: "wse", start: "2026-10-03", due: "2026-10-06", tags: [REQ, "Access"],
    notes: "Needed to connect the current WhatsApp platform to HubSpot and to the AI WhatsApp Agent.",
    checklist: [
      "Provider name and account manager contact",
      "API credentials or partner access from the provider",
      "WhatsApp Business numbers and display names",
      "List of approved message templates",
      "Webhook and integration documentation",
      "Current monthly conversation volume and cost",
    ],
  },
  {
    id: "r06", title: "Briefing on the current marketing work", system: "program", status: "todo", phase: "discovery", priority: "high",
    team: "wse", start: "2026-10-03", due: "2026-10-06", tags: [REQ],
    notes: "Understand what is running today, who runs it and how it is measured.",
    checklist: [
      "Active campaigns and channels, online and offline",
      "Who does what: in-house team, other agencies, freelancers",
      "Current offers, promotions and pricing",
      "Campaign and content calendar for Q4 2026",
      "Reports and KPIs used today",
      "Approval process for ads and content",
    ],
  },
  {
    id: "r07", title: "Walkthrough of the sales system", system: "sync", status: "todo", phase: "discovery", priority: "high",
    team: "wse", start: "2026-10-03", due: "2026-10-07", tags: [REQ],
    notes: "How a lead becomes a customer today, from first contact to enrolment.",
    checklist: [
      "Lead flow from forms, WhatsApp and calls into HubSpot",
      "Lead assignment rules and response time targets",
      "Lifecycle stage and deal stage definitions",
      "Sales team structure: centres, B2C, B2B, B2G",
      "Placement test and appointment process",
      "Follow-up cadence, scripts and sales targets",
      "Access to HubSpot pipelines and reports",
    ],
  },
  {
    id: "r08", title: "Marketing budget: B2C, B2B and B2G", system: "program", status: "todo", phase: "discovery", priority: "critical",
    team: "wse", start: "2026-10-03", due: "2026-10-06", tags: [REQ, "Budget"],
    checklist: [
      "B2C monthly media budget for Oct, Nov, Dec",
      "B2B budget: LinkedIn, outbound tools, events",
      "B2G budget",
      "Split by channel: Google, Meta, Snapchat, TikTok, other",
      "Approved monthly ceiling and who approves changes",
      "Billing method for each ad platform",
    ],
  },
  {
    id: "r09", title: "Gaps and problems WSE sees as priorities", system: "program", status: "todo", phase: "discovery", priority: "high",
    team: "wse", start: "2026-10-03", due: "2026-10-07", tags: [REQ],
    notes: "The problems the WSE team sees and wants fixed first. Compare with the audit gaps below.",
    checklist: [
      "Marketing problems",
      "Sales and follow-up problems",
      "Problems with current tools or agencies",
      "What to fix first",
    ],
  },
  {
    id: "r10", title: "Content library", system: "social", status: "todo", phase: "discovery", priority: "high",
    team: "wse", start: "2026-10-03", due: "2026-10-08", tags: [REQ],
    notes: "Everything WSE has today, to reuse in ads, social media and landing pages.",
    checklist: [
      "Brand guidelines, logos and fonts",
      "Photo and video library: centres, students, teachers",
      "Past ad creatives and their results",
      "Testimonials and success stories",
      "Course catalogue, levels and pricing",
      "B2B and B2G presentations and case studies",
      "Approved Arabic and English copy",
    ],
  },

  // Gaps from the audits, owned by Clicksalesmedia
  {
    id: "g01", title: "Stop wasted search spend", system: "ads", status: "todo", phase: "build", priority: "critical",
    team: "csm", start: "2026-10-04", due: "2026-10-12", tags: ["Gap"], dependsOn: ["r01"],
    notes: "About 31% of search-term spend in Q3 brought zero conversions (around 170K SAR).",
    checklist: ["Negative keyword sweep", "Match type and search term cleanup", "Pause zero-conversion ad groups", "Weekly waste report"],
  },
  {
    id: "g02", title: "Raise Quality Score and win back impression share", system: "ads", status: "todo", phase: "build", priority: "high",
    team: "csm", start: "2026-10-06", due: "2026-10-26", tags: ["Gap"], dependsOn: ["g01"],
    notes: "Impression share lost to rank is 49% to 67%. Around 260K SAR went to keywords with Quality Score 5 or lower.",
    checklist: ["Tighter ad groups and ad relevance", "Landing page experience fixes", "Brand protection"],
  },
  {
    id: "g03", title: "Fix HubSpot lifecycle: leads stuck in \"Other\"", system: "sync", status: "todo", phase: "build", priority: "critical",
    team: "csm", start: "2026-10-07", due: "2026-10-24", tags: ["Gap"], dependsOn: ["r07"],
    notes: "Most new digital contacts sit in the lifecycle stage \"Other\", so lead quality and return cannot be measured.",
    checklist: ["Agree stage definitions with sales", "Re-map existing contacts", "Automate stage updates"],
  },
  {
    id: "g04", title: "Restart Meta with the proven assets", system: "ads", status: "todo", phase: "launch", priority: "high",
    team: "csm", start: "2026-10-07", due: "2026-10-20", tags: ["Gap"], dependsOn: ["r02", "r10"],
    notes: "All Meta campaigns have been paused since 1 Sep. Spend was almost all on Instagram and the best creatives were underfunded.",
    checklist: ["Relaunch best lookalike audiences", "Scale the best creatives", "Test Facebook placements"],
  },
  {
    id: "g05", title: "Dedicated landing pages for high-intent searches", system: "lp", status: "todo", phase: "build", priority: "high",
    team: "csm", start: "2026-10-08", due: "2026-10-30", tags: ["Gap"], dependsOn: ["r10"],
    notes: "High-intent search clusters land on generic pages.",
  },
  {
    id: "g06", title: "Grow organic leads with SEO", system: "lp", status: "backlog", phase: "build", priority: "medium",
    team: "csm", start: "2026-10-19", due: "2026-11-30", tags: ["Gap"],
    notes: "Organic brings a very small share of contacts, yet converts better than paid (4.4% vs 2.5%).",
  },
  {
    id: "g07", title: "Sync WhatsApp with HubSpot and speed up lead response", system: "whatsapp", status: "todo", phase: "build", priority: "high",
    team: "csm", start: "2026-10-07", due: "2026-10-28", tags: ["Gap"], dependsOn: ["r05", "r07"],
    notes: "WhatsApp replies do not update contact status in HubSpot.",
  },
  {
    id: "g08", title: "Rules for testing new campaigns", system: "program", status: "todo", phase: "discovery", priority: "medium",
    team: "csm", start: "2026-10-05", due: "2026-10-09", tags: ["Gap"], dependsOn: ["r08"],
    notes: "Q1 experiments cost around 373K SAR without stop rules. Every test needs a budget cap, a success metric and a stop date.",
  },
];

export const starterTasks = (): Task[] =>
  seed.map(({ checklist, ...t }) => ({
    notes: "",
    dependsOn: [],
    tags: [],
    assignees: [],
    ...t,
    checklist: (checklist ?? []).map((c, i) => {
      const [text, done] = typeof c === "string" ? [c, false] : c;
      return { id: `${t.id}-c${i + 1}`, text, done };
    }),
  }));
