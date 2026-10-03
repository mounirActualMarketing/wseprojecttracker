export type SystemId = string;

export type Status = "backlog" | "todo" | "in_progress" | "waiting" | "review" | "done";
export type Phase = "discovery" | "build" | "testing" | "launch" | "optimise";
export type Priority = "low" | "medium" | "high" | "critical";

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  notes: string;
  system: SystemId;
  status: Status;
  phase: Phase;
  priority: Priority;
  team: string | null; // responsible team id
  assignees: string[]; // user ids
  start: string; // yyyy-mm-dd
  due: string; // yyyy-mm-dd
  dependsOn: string[];
  tags: string[];
  checklist: ChecklistItem[];
}

export interface System {
  id: SystemId;
  name: string;
  short: string;
  color: string; // solid (bars, dots), dark enough for white text
}

export type Role = "admin" | "member" | "viewer";

export interface Team {
  id: string;
  name: string;
  color: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  team: string | null;
  active: boolean;
  pending: boolean; // invited, password not set yet
}

export const ROLES: { id: Role; label: string; hint: string }[] = [
  { id: "admin", label: "Admin", hint: "Everything, including team, systems and plan reset" },
  { id: "member", label: "Member", hint: "Create and edit tasks, add systems" },
  { id: "viewer", label: "Viewer", hint: "Read only" },
];

// Picker palette for systems and teams (Asana/ClickUp-like, white text readable)
export const PALETTE = ["#64748B", "#7B68EE", "#4573D2", "#2E9E6B", "#E0559B", "#9D5BD2", "#E8743B", "#1A9E99", "#D9485F", "#B7791F", "#0E7490", "#4D7C0F"];

// Teams the database starts with
export const DEFAULT_TEAMS: Team[] = [
  { id: "wse", name: "Wall Street English", color: "#153359" },
  { id: "csm", name: "Clicksalesmedia", color: "#B7791F" },
];

// Systems the database starts with; after that they are managed in the app
export const DEFAULT_SYSTEMS: System[] = [
  { id: "program", name: "Programme and Governance", short: "Programme", color: "#64748B" },
  { id: "orchestration", name: "AI Orchestration Layer", short: "Orchestration", color: "#7B68EE" },
  { id: "ads", name: "AI Advertising Agent", short: "Advertising", color: "#4573D2" },
  { id: "whatsapp", name: "AI WhatsApp Agent", short: "WhatsApp", color: "#2E9E6B" },
  { id: "social", name: "AI Social Media", short: "Social and Content", color: "#E0559B" },
  { id: "b2b", name: "AI B2B and B2G", short: "B2B / B2G", color: "#9D5BD2" },
  { id: "franchise", name: "AI Franchise", short: "Franchise", color: "#E8743B" },
  { id: "lp", name: "Landing Pages, CRO and SEO", short: "LP, CRO, SEO", color: "#1A9E99" },
  { id: "sync", name: "Marketing and Sales Sync", short: "Sales Sync", color: "#D9485F" },
];

// ClickUp-style status palette: solid color + soft background + readable foreground
export const STATUSES: { id: Status; label: string; color: string; bg: string; fg: string }[] = [
  { id: "backlog", label: "Backlog", color: "#9AA1AC", bg: "#F4F5F7", fg: "#6B7280" },
  { id: "todo", label: "To do", color: "#87909E", bg: "#EEF0F3", fg: "#374151" },
  { id: "in_progress", label: "In progress", color: "#4194F6", bg: "#EAF3FE", fg: "#1D5FB8" },
  { id: "waiting", label: "Waiting", color: "#F59E0B", bg: "#FEF4E2", fg: "#9A5800" },
  { id: "review", label: "Review", color: "#A855F7", bg: "#F5EDFE", fg: "#7E22CE" },
  { id: "done", label: "Done", color: "#10B981", bg: "#E6F8F1", fg: "#047857" },
];

export const PHASES: { id: Phase; label: string; hint: string }[] = [
  { id: "discovery", label: "Discovery", hint: "Access, data, baselines" },
  { id: "build", label: "Custom build", hint: "Build for WSE" },
  { id: "testing", label: "Testing", hint: "QA, warm-up, A/B" },
  { id: "launch", label: "Launch", hint: "Go live" },
  { id: "optimise", label: "Optimise", hint: "Continuous enhancement" },
];

export const PRIORITIES: { id: Priority; label: string; color: string }[] = [
  { id: "low", label: "Low", color: "#9CA3AF" },
  { id: "medium", label: "Normal", color: "#4194F6" },
  { id: "high", label: "High", color: "#F59E0B" },
  { id: "critical", label: "Urgent", color: "#E5484D" },
];

const TAG_STYLES: Record<string, { bg: string; fg: string }> = {
  "Request to WSE": { bg: "#EFEDFD", fg: "#5B4BD6" },
  Access: { bg: "#E8F1FE", fg: "#1D5FB8" },
  Gap: { bg: "#FDECEC", fg: "#C2343A" },
  Budget: { bg: "#E6F8F1", fg: "#047857" },
};
const TAG_PALETTE = [
  { bg: "#FEF4E2", fg: "#9A5800" },
  { bg: "#FCEBF4", fg: "#B4246F" },
  { bg: "#E7F7F6", fg: "#0F766E" },
  { bg: "#F5EDFE", fg: "#7E22CE" },
  { bg: "#EEF0F3", fg: "#374151" },
];
export const tagStyle = (tag: string) => {
  if (TAG_STYLES[tag]) return TAG_STYLES[tag];
  let h = 0;
  for (const c of tag) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TAG_PALETTE[h % TAG_PALETTE.length];
};

export const statusOf = (id: Status) => STATUSES.find((s) => s.id === id) ?? STATUSES[0];
export const phaseOf = (id: Phase) => PHASES.find((p) => p.id === id) ?? PHASES[0];
export const priorityOf = (id: Priority) => PRIORITIES.find((p) => p.id === id) ?? PRIORITIES[0];

// Initial term: 1 Oct 2026 to 31 Dec 2026 (three months, starts once the agreement is signed)
export const TERM_START = "2026-10-01";
export const TERM_END = "2026-12-31";
