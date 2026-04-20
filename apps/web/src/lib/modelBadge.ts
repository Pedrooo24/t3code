import type { ModelSelection } from "@t3tools/contracts";

export function formatModelBadgeLabel(
  selection: ModelSelection | null | undefined,
): string | null {
  if (!selection) return null;
  const raw = selection.model;
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.includes("opus")) return "Opus";
  if (lower.includes("sonnet")) return "Sonnet";
  if (lower.includes("haiku")) return "Haiku";
  const match = raw.match(/claude[-_]?([a-z0-9]+)/i);
  if (match) return match[1].charAt(0).toUpperCase() + match[1].slice(1);
  return raw.length > 12 ? raw.slice(0, 12) + "..." : raw;
}

export function formatModelBadgeTooltip(
  selection: ModelSelection | null | undefined,
): string | null {
  if (!selection) return null;
  return `${selection.provider === "claudeAgent" ? "Claude" : selection.provider} · ${selection.model}`;
}
