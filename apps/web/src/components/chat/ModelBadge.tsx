import type { ModelSelection } from "@t3tools/contracts";
import { cn } from "~/lib/utils";
import { formatModelBadgeLabel, formatModelBadgeTooltip } from "~/lib/modelBadge";

export type ModelBadgeState = "idle" | "generating" | "thinking";

export function ModelBadge({
  selection,
  className,
  size = "sm",
  state = "idle",
}: {
  selection: ModelSelection | null | undefined;
  className?: string;
  size?: "xs" | "sm";
  state?: ModelBadgeState;
}) {
  const label = formatModelBadgeLabel(selection);
  if (!label) return null;
  const tooltip = formatModelBadgeTooltip(selection);
  const isActive = state === "generating" || state === "thinking";
  return (
    <span
      title={tooltip ?? undefined}
      className={cn(
        "relative inline-flex items-center rounded-md border font-medium uppercase tracking-wide",
        size === "xs" ? "px-1 py-0 text-[10px]" : "px-1.5 py-0.5 text-[11px]",
        isActive
          ? "border-teal-500/60 bg-teal-500/10 text-teal-700 dark:text-teal-300"
          : "border-border bg-muted/30 text-muted-foreground",
        className,
      )}
    >
      {isActive && (
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 rounded-md ring-1 ring-teal-500/50",
            "animate-pulse",
          )}
        />
      )}
      {label}
    </span>
  );
}
