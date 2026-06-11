import type { AppNotification } from "./notifications-api";
import {
  normalizeNotificationCategory,
  type NotificationCategory,
} from "./notification-center";

export type NotificationVisualTone =
  | "messages"
  | "marketplace"
  | "orders"
  | "support"
  | "social"
  | "reports"
  | "security"
  | "updates"
  | "system";

export type NotificationVisualProfile = {
  tone: NotificationVisualTone;
  accentBar: string;
  iconShellUnread: string;
  iconShellRead: string;
  badge: string;
  unreadCard: string;
  readCard: string;
  titleUnread: string;
  titleRead: string;
};

const TONE_BY_CATEGORY: Record<NotificationCategory, NotificationVisualTone> = {
  messages: "messages",
  marketplace: "marketplace",
  orders: "orders",
  support: "support",
  social: "social",
  reports: "reports",
  trust_safety: "security",
  security: "security",
  admin: "updates",
  system: "system",
};

const PROFILES: Record<NotificationVisualTone, NotificationVisualProfile> = {
  messages: {
    tone: "messages",
    accentBar: "bg-primary",
    iconShellUnread:
      "border-primary/50 bg-primary/18 text-primary shadow-[0_0_16px_-8px_hsl(var(--primary)/0.55)] ring-primary/30",
    iconShellRead: "border-primary/25 bg-primary/8 text-primary/75 ring-primary/12",
    badge: "border-primary/35 bg-primary/12 text-primary",
    unreadCard:
      "border-primary/50 bg-[#0A0A0A]/92 ring-primary/28 shadow-[0_0_28px_-14px_hsl(var(--primary)/0.38)]",
    readCard: "border-primary/18 bg-[#0A0A0A]/62 ring-primary/8 opacity-90",
    titleUnread: "text-primary",
    titleRead: "text-zinc-200",
  },
  marketplace: {
    tone: "marketplace",
    accentBar: "bg-emerald-400",
    iconShellUnread:
      "border-emerald-400/45 bg-emerald-400/12 text-emerald-300 shadow-[0_0_14px_-8px_rgba(52,211,153,0.45)] ring-emerald-400/25",
    iconShellRead: "border-emerald-400/20 bg-emerald-400/6 text-emerald-300/70 ring-emerald-400/10",
    badge: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    unreadCard:
      "border-emerald-400/35 bg-[#0A0A0A]/90 ring-emerald-400/18 shadow-[0_0_22px_-14px_rgba(52,211,153,0.28)]",
    readCard: "border-emerald-400/14 bg-[#0A0A0A]/62 ring-emerald-400/8 opacity-90",
    titleUnread: "text-emerald-200",
    titleRead: "text-zinc-200",
  },
  orders: {
    tone: "orders",
    accentBar: "bg-amber-400",
    iconShellUnread:
      "border-amber-400/50 bg-amber-400/14 text-amber-200 shadow-[0_0_14px_-8px_rgba(251,191,36,0.42)] ring-amber-400/28",
    iconShellRead: "border-amber-400/22 bg-amber-400/8 text-amber-200/70 ring-amber-400/12",
    badge: "border-amber-400/32 bg-amber-400/10 text-amber-200",
    unreadCard:
      "border-amber-400/38 bg-[#0A0A0A]/90 ring-amber-400/20 shadow-[0_0_22px_-14px_rgba(251,191,36,0.26)]",
    readCard: "border-amber-400/14 bg-[#0A0A0A]/62 ring-amber-400/8 opacity-90",
    titleUnread: "text-amber-100",
    titleRead: "text-zinc-200",
  },
  support: {
    tone: "support",
    accentBar: "bg-sky-400",
    iconShellUnread:
      "border-sky-400/45 bg-sky-400/12 text-sky-200 shadow-[0_0_14px_-8px_rgba(56,189,248,0.38)] ring-sky-400/25",
    iconShellRead: "border-sky-400/20 bg-sky-400/6 text-sky-200/70 ring-sky-400/10",
    badge: "border-sky-400/30 bg-sky-400/10 text-sky-200",
    unreadCard:
      "border-sky-400/32 bg-[#0A0A0A]/90 ring-sky-400/16 shadow-[0_0_20px_-14px_rgba(56,189,248,0.22)]",
    readCard: "border-sky-400/14 bg-[#0A0A0A]/62 ring-sky-400/8 opacity-90",
    titleUnread: "text-sky-100",
    titleRead: "text-zinc-200",
  },
  social: {
    tone: "social",
    accentBar: "bg-violet-400",
    iconShellUnread:
      "border-violet-400/45 bg-violet-400/12 text-violet-200 shadow-[0_0_14px_-8px_rgba(167,139,250,0.38)] ring-violet-400/25",
    iconShellRead: "border-violet-400/20 bg-violet-400/6 text-violet-200/70 ring-violet-400/10",
    badge: "border-violet-400/30 bg-violet-400/10 text-violet-200",
    unreadCard:
      "border-violet-400/32 bg-[#0A0A0A]/90 ring-violet-400/16 shadow-[0_0_20px_-14px_rgba(167,139,250,0.22)]",
    readCard: "border-violet-400/14 bg-[#0A0A0A]/62 ring-violet-400/8 opacity-90",
    titleUnread: "text-violet-100",
    titleRead: "text-zinc-200",
  },
  reports: {
    tone: "reports",
    accentBar: "bg-orange-400",
    iconShellUnread:
      "border-orange-400/45 bg-orange-400/12 text-orange-200 shadow-[0_0_14px_-8px_rgba(251,146,60,0.38)] ring-orange-400/25",
    iconShellRead: "border-orange-400/20 bg-orange-400/6 text-orange-200/70 ring-orange-400/10",
    badge: "border-orange-400/30 bg-orange-400/10 text-orange-200",
    unreadCard:
      "border-orange-400/32 bg-[#0A0A0A]/90 ring-orange-400/16 shadow-[0_0_20px_-14px_rgba(251,146,60,0.22)]",
    readCard: "border-orange-400/14 bg-[#0A0A0A]/62 ring-orange-400/8 opacity-90",
    titleUnread: "text-orange-100",
    titleRead: "text-zinc-200",
  },
  security: {
    tone: "security",
    accentBar: "bg-red-400",
    iconShellUnread:
      "border-red-400/50 bg-red-400/14 text-red-200 shadow-[0_0_16px_-8px_rgba(248,113,113,0.45)] ring-red-400/28",
    iconShellRead: "border-red-400/22 bg-red-400/8 text-red-200/70 ring-red-400/12",
    badge: "border-red-400/35 bg-red-400/12 text-red-200",
    unreadCard:
      "border-red-400/40 bg-[#0A0A0A]/92 ring-red-400/22 shadow-[0_0_24px_-14px_rgba(248,113,113,0.32)]",
    readCard: "border-red-400/14 bg-[#0A0A0A]/62 ring-red-400/8 opacity-90",
    titleUnread: "text-red-100",
    titleRead: "text-zinc-200",
  },
  updates: {
    tone: "updates",
    accentBar: "bg-primary",
    iconShellUnread:
      "border-primary/45 bg-primary/14 text-primary shadow-[0_0_14px_-8px_hsl(var(--primary)/0.45)] ring-primary/25",
    iconShellRead: "border-primary/20 bg-primary/6 text-primary/70 ring-primary/10",
    badge: "border-primary/30 bg-primary/10 text-primary",
    unreadCard:
      "border-primary/38 bg-[#0A0A0A]/90 ring-primary/18 shadow-[0_0_20px_-14px_hsl(var(--primary)/0.28)]",
    readCard: "border-primary/14 bg-[#0A0A0A]/62 ring-primary/8 opacity-90",
    titleUnread: "text-primary",
    titleRead: "text-zinc-200",
  },
  system: {
    tone: "system",
    accentBar: "bg-zinc-400",
    iconShellUnread:
      "border-zinc-400/40 bg-zinc-400/10 text-zinc-200 shadow-[0_0_12px_-8px_rgba(161,161,170,0.35)] ring-zinc-400/20",
    iconShellRead: "border-zinc-500/25 bg-zinc-500/8 text-zinc-400 ring-zinc-500/10",
    badge: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
    unreadCard:
      "border-zinc-400/28 bg-[#0A0A0A]/88 ring-zinc-400/14 shadow-[0_0_18px_-14px_rgba(161,161,170,0.18)]",
    readCard: "border-zinc-500/14 bg-[#0A0A0A]/60 ring-zinc-500/8 opacity-88",
    titleUnread: "text-zinc-100",
    titleRead: "text-zinc-300",
  },
};

export function resolveNotificationVisualProfile(
  n: Pick<AppNotification, "category" | "type" | "priority">,
): NotificationVisualProfile {
  const category = normalizeNotificationCategory(n);
  const tone = TONE_BY_CATEGORY[category];
  return PROFILES[tone];
}

export function isHighPriorityNotification(
  n: Pick<AppNotification, "priority" | "category" | "type">,
): boolean {
  const p = Number(n.priority);
  if (Number.isInteger(p) && p <= 1) return true;
  const cat = normalizeNotificationCategory(n);
  return cat === "security" || cat === "trust_safety";
}
