import type { ModelSelection } from "@t3tools/contracts";
import { cn } from "~/lib/utils";
import { formatModelBadgeLabel, formatModelBadgeTooltip } from "~/lib/modelBadge";

export function ModelBadge({
  selection,
  className,
  size = "sm",
}: {
  selection: ModelSelection | null | undefined;
  className?: string;
  size?: "xs" | "sm";
}) {
  const label = formatModelBadgeLabel(selection);
  if (!label) return null;
  const tooltip = formatModelBadgeTooltip(selection);
  return (
    <span
      title={tooltip ?? undefined}
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-muted/30 font-medium uppercase tracking-wide text-muted-foreground",
        size === "xs" ? "px-1 py-0 text-[10px]" : "px-1.5 py-0.5 text-[11px]",
        className,
      )}
    >
      {label}
    </span>
  );
}
