import { useEffect, useState } from "react";
import { Bot } from "lucide-react";
import type { OrchestrationThreadActivity } from "@t3tools/contracts";
import { cn } from "~/lib/utils";

function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

const SUBAGENT_ITEM_TYPES = new Set(["collab_agent_tool_call", "dynamic_tool_call"]);

function payloadItemType(activity: OrchestrationThreadActivity): string | undefined {
  const p = activity.payload as Record<string, unknown> | null | undefined;
  const t = p?.itemType;
  return typeof t === "string" ? t : undefined;
}

function isSubagentStarted(activity: OrchestrationThreadActivity): boolean {
  return activity.kind === "tool.started" && SUBAGENT_ITEM_TYPES.has(payloadItemType(activity) ?? "");
}

function isSubagentCompleted(activity: OrchestrationThreadActivity): boolean {
  return (
    (activity.kind === "tool.completed" || activity.kind === "tool.updated") &&
    SUBAGENT_ITEM_TYPES.has(payloadItemType(activity) ?? "")
  );
}

/**
 * Returns started activities that have no matching completion.
 *
 * Correlation strategy: pair by toolCallId when available (ACP provider);
 * fall back to ordinal pairing (n-th started <-> n-th completed of same
 * itemType) for Claude provider which does not expose toolCallId on
 * tool.started activities.
 */
function deriveRunningSubagents(
  activities: ReadonlyArray<OrchestrationThreadActivity>,
): OrchestrationThreadActivity[] {
  const started = activities.filter(isSubagentStarted);
  if (started.length === 0) return [];

  const completedByCallId = new Map<string, number>();
  const completedOrdinalByType: Record<string, number> = {};

  for (const a of activities) {
    if (!isSubagentCompleted(a)) continue;
    const p = a.payload as Record<string, unknown> | null | undefined;
    const data = p?.data as Record<string, unknown> | null | undefined;
    const callId = typeof data?.toolCallId === "string" ? data.toolCallId : null;
    if (callId) {
      completedByCallId.set(callId, (completedByCallId.get(callId) ?? 0) + 1);
    } else {
      const t = payloadItemType(a) ?? "";
      completedOrdinalByType[t] = (completedOrdinalByType[t] ?? 0) + 1;
    }
  }

  const consumedOrdinalByType: Record<string, number> = {};
  const result: OrchestrationThreadActivity[] = [];

  for (const a of started) {
    const p = a.payload as Record<string, unknown> | null | undefined;
    const data = p?.data as Record<string, unknown> | null | undefined;
    const callId = typeof data?.toolCallId === "string" ? data.toolCallId : null;
    const itemType = payloadItemType(a) ?? "";

    if (callId) {
      const remaining = completedByCallId.get(callId) ?? 0;
      if (remaining > 0) {
        completedByCallId.set(callId, remaining - 1);
      } else {
        result.push(a);
      }
    } else {
      const consumed = consumedOrdinalByType[itemType] ?? 0;
      const available = completedOrdinalByType[itemType] ?? 0;
      if (consumed < available) {
        consumedOrdinalByType[itemType] = consumed + 1;
      } else {
        result.push(a);
      }
    }
  }

  return result;
}

function subagentName(activity: OrchestrationThreadActivity): string {
  // summary format from server: "Subagent task started" or "code-reviewer: Review..." started
  // Try to extract subagent_type from payload.data.input first (available on ACP provider)
  const p = activity.payload as Record<string, unknown> | null | undefined;
  const data = p?.data as Record<string, unknown> | null | undefined;
  const input = data?.input as Record<string, unknown> | null | undefined;
  const fromInput =
    typeof input?.subagent_type === "string"
      ? input.subagent_type.trim()
      : typeof input?.subagentType === "string"
        ? input.subagentType.trim()
        : null;
  if (fromInput) return fromInput;

  // Fall back to detail which may contain "subagent_type: description"
  const detail = typeof p?.detail === "string" ? p.detail.trim() : null;
  if (detail) {
    const colonIdx = detail.indexOf(":");
    if (colonIdx > 0 && colonIdx < 48) {
      const candidate = detail.slice(0, colonIdx).trim();
      if (candidate.length > 0 && !candidate.includes(" ")) return candidate;
    }
    // Return first 32 chars of detail as fallback label
    return detail.length > 32 ? `${detail.slice(0, 31)}…` : detail;
  }

  return "subagent";
}

function formatElapsed(createdAt: string, now: number): string {
  const t = Date.parse(createdAt);
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function SubagentPanel({
  activities,
  className,
}: {
  activities: ReadonlyArray<OrchestrationThreadActivity>;
  className?: string;
}) {
  const now = useNow();
  const running = deriveRunningSubagents(activities);
  if (running.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-b border-border bg-muted/20 px-4 py-2 text-xs",
        className,
      )}
    >
      <span className="uppercase tracking-wide text-muted-foreground/60">Subagentes</span>
      {running.map((a) => (
        <span
          key={a.id}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5"
        >
          <Bot className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium">{subagentName(a)}</span>
          <span className="tabular-nums text-muted-foreground">{formatElapsed(a.createdAt, now)}</span>
        </span>
      ))}
    </div>
  );
}
