import { useEffect, useRef, useState } from "react";
import { Bot, ChevronDown, ChevronUp, Copy } from "lucide-react";
import type { OrchestrationThreadActivity } from "@t3tools/contracts";
import { cn } from "~/lib/utils";
import { strings } from "~/strings";

const s = strings.subagents;

// ---------------------------------------------------------------------------
// Tick hook
// ---------------------------------------------------------------------------
function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// ---------------------------------------------------------------------------
// Payload helpers
// ---------------------------------------------------------------------------
const SUBAGENT_ITEM_TYPES = new Set(["collab_agent_tool_call", "dynamic_tool_call"]);

function payloadItemType(a: OrchestrationThreadActivity): string | undefined {
  const p = a.payload as Record<string, unknown> | null | undefined;
  const t = p?.itemType;
  return typeof t === "string" ? t : undefined;
}

function isSubagentStarted(a: OrchestrationThreadActivity): boolean {
  return a.kind === "tool.started" && SUBAGENT_ITEM_TYPES.has(payloadItemType(a) ?? "");
}

function isSubagentCompleted(a: OrchestrationThreadActivity): boolean {
  return (
    (a.kind === "tool.completed" || a.kind === "tool.updated") &&
    SUBAGENT_ITEM_TYPES.has(payloadItemType(a) ?? "")
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SubagentEntry {
  started: OrchestrationThreadActivity;
  completed: OrchestrationThreadActivity | null;
}

// ---------------------------------------------------------------------------
// deriveAllSubagents
// Correlates started->completed via toolCallId (ACP) or ordinal fallback (Claude)
// ---------------------------------------------------------------------------
function deriveAllSubagents(
  activities: ReadonlyArray<OrchestrationThreadActivity>,
): { running: SubagentEntry[]; completed: SubagentEntry[] } {
  const started = activities.filter(isSubagentStarted);
  if (started.length === 0) return { running: [], completed: [] };

  // Build completion maps
  const completedByCallId = new Map<string, OrchestrationThreadActivity[]>();
  const completedOrdinalByType: Record<string, OrchestrationThreadActivity[]> = {};

  for (const a of activities) {
    if (!isSubagentCompleted(a)) continue;
    const p = a.payload as Record<string, unknown> | null | undefined;
    const data = p?.data as Record<string, unknown> | null | undefined;
    const callId = typeof data?.toolCallId === "string" ? data.toolCallId : null;
    if (callId) {
      const arr = completedByCallId.get(callId) ?? [];
      arr.push(a);
      completedByCallId.set(callId, arr);
    } else {
      const t = payloadItemType(a) ?? "";
      const arr = completedOrdinalByType[t] ?? [];
      arr.push(a);
      completedOrdinalByType[t] = arr;
    }
  }

  const consumedByCallId = new Map<string, number>();
  const consumedOrdinalByType: Record<string, number> = {};

  const running: SubagentEntry[] = [];
  const completed: SubagentEntry[] = [];

  for (const a of started) {
    const p = a.payload as Record<string, unknown> | null | undefined;
    const data = p?.data as Record<string, unknown> | null | undefined;
    const callId = typeof data?.toolCallId === "string" ? data.toolCallId : null;
    const itemType = payloadItemType(a) ?? "";

    let match: OrchestrationThreadActivity | null = null;

    if (callId) {
      const arr = completedByCallId.get(callId) ?? [];
      const idx = consumedByCallId.get(callId) ?? 0;
      if (idx < arr.length) {
        match = arr[idx]!;
        consumedByCallId.set(callId, idx + 1);
      }
    } else {
      const arr = completedOrdinalByType[itemType] ?? [];
      const idx = consumedOrdinalByType[itemType] ?? 0;
      if (idx < arr.length) {
        match = arr[idx]!;
        consumedOrdinalByType[itemType] = idx + 1;
      }
    }

    if (match) {
      completed.push({ started: a, completed: match });
    } else {
      running.push({ started: a, completed: null });
    }
  }

  return { running, completed };
}

// ---------------------------------------------------------------------------
// Name extraction (same logic as before)
// ---------------------------------------------------------------------------
function subagentName(a: OrchestrationThreadActivity): string {
  const p = a.payload as Record<string, unknown> | null | undefined;
  const data = p?.data as Record<string, unknown> | null | undefined;
  const input = data?.input as Record<string, unknown> | null | undefined;
  const fromInput =
    typeof input?.subagent_type === "string"
      ? input.subagent_type.trim()
      : typeof input?.subagentType === "string"
        ? input.subagentType.trim()
        : null;
  if (fromInput) return fromInput;

  const detail = typeof p?.detail === "string" ? p.detail.trim() : null;
  if (detail) {
    const colonIdx = detail.indexOf(":");
    if (colonIdx > 0 && colonIdx < 48) {
      const candidate = detail.slice(0, colonIdx).trim();
      if (candidate.length > 0 && !candidate.includes(" ")) return candidate;
    }
    return detail.length > 32 ? `${detail.slice(0, 31)}\u2026` : detail;
  }
  return "subagent";
}

function subagentDescription(a: OrchestrationThreadActivity): string | null {
  const p = a.payload as Record<string, unknown> | null | undefined;
  const data = p?.data as Record<string, unknown> | null | undefined;
  const input = data?.input as Record<string, unknown> | null | undefined;
  const desc = typeof input?.description === "string" ? input.description.trim() : null;
  if (!desc) return null;
  return desc.length > 80 ? `${desc.slice(0, 79)}\u2026` : desc;
}

// ---------------------------------------------------------------------------
// Duration formatting
// ---------------------------------------------------------------------------
function formatElapsed(startIso: string, endMs: number): string {
  const t = Date.parse(startIso);
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.round((endMs - t) / 1000));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function fixedDuration(started: OrchestrationThreadActivity, completed: OrchestrationThreadActivity): string {
  const end = Date.parse(completed.createdAt);
  if (Number.isNaN(end)) return "";
  return formatElapsed(started.createdAt, end);
}

// ---------------------------------------------------------------------------
// Output extraction from completed activity
// ---------------------------------------------------------------------------
function extractOutput(completed: OrchestrationThreadActivity): string | null {
  const p = completed.payload as Record<string, unknown> | null | undefined;
  const data = p?.data as Record<string, unknown> | null | undefined;

  const result = data?.result;
  if (typeof result === "string" && result.trim()) return result.trim();

  const rawOutput = data?.rawOutput as Record<string, unknown> | null | undefined;
  if (rawOutput) {
    const content = rawOutput.content;
    if (typeof content === "string" && content.trim()) return content.trim();
    if (Array.isArray(content)) {
      const joined = content
        .map((c: unknown) => (typeof c === "object" && c !== null ? (c as Record<string, unknown>).text : null))
        .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
        .join("\n");
      if (joined.trim()) return joined.trim();
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
type AgentStatus = "running" | "completed" | "error" | "stalled";

function statusBadge(entry: SubagentEntry, now: number): AgentStatus {
  if (entry.completed) {
    const p = entry.completed.payload as Record<string, unknown> | null | undefined;
    const data = p?.data as Record<string, unknown> | null | undefined;
    if (data?.error || data?.errorMessage) return "error";
    return "completed";
  }
  // Stalled: started > 5 min ago with no completion
  const t = Date.parse(entry.started.createdAt);
  if (!Number.isNaN(t) && now - t > 5 * 60 * 1000) return "stalled";
  return "running";
}

const STATUS_CLASSES: Record<AgentStatus, string> = {
  running: "bg-teal-500/20 text-teal-400",
  completed: "bg-emerald-500/20 text-emerald-400",
  error: "bg-red-500/20 text-red-400",
  stalled: "bg-amber-500/20 text-amber-400",
};

const STATUS_LABELS: Record<AgentStatus, string> = {
  running: "a correr",
  completed: "concluido",
  error: "erro",
  stalled: s.stalled,
};

// ---------------------------------------------------------------------------
// CopyButton
// ---------------------------------------------------------------------------
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleCopy() {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-1 inline-flex items-center rounded p-0.5 text-muted-foreground transition hover:text-foreground"
      title={s.copiar}
    >
      <Copy size={10} />
      {copied && <span className="ml-1 text-[10px]">ok</span>}
    </button>
  );
}

// ---------------------------------------------------------------------------
// SubagentCard
// ---------------------------------------------------------------------------
function SubagentCard({
  entry,
  now,
  focused,
  dimmed,
  inheritedModel,
  inheritedEffort,
  onClick,
}: {
  entry: SubagentEntry;
  now: number;
  focused: boolean;
  dimmed: boolean;
  inheritedModel: string;
  inheritedEffort: string;
  onClick: () => void;
}) {
  const status = statusBadge(entry, now);
  const name = subagentName(entry.started);
  const desc = subagentDescription(entry.started);
  const timer =
    entry.completed
      ? fixedDuration(entry.started, entry.completed)
      : formatElapsed(entry.started.createdAt, now);
  const output = entry.completed ? extractOutput(entry.completed) : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      className={cn(
        "w-[300px] cursor-pointer rounded-lg border p-3 space-y-2 transition-all select-none",
        focused
          ? "border-teal-500/60 bg-card shadow-sm"
          : "border-border bg-card/60",
        dimmed && "opacity-60",
      )}
    >
      {/* L1: icon + name + status */}
      <div className="flex items-center gap-1.5">
        <Bot size={13} className="shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate text-xs font-medium">{name}</span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
            STATUS_CLASSES[status],
          )}
        >
          {status === "running" && (
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
          )}
          {STATUS_LABELS[status]}
        </span>
      </div>

      {/* L2: model + effort badges */}
      <div className="flex flex-wrap gap-1">
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {s.modelo}: {inheritedModel} ({s.herdado})
        </span>
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {s.effort}: {inheritedEffort} ({s.herdado})
        </span>
      </div>

      {/* L3: description */}
      {desc && (
        <p className="text-[11px] leading-snug opacity-70">{desc}</p>
      )}

      {/* L4: timer */}
      {timer && (
        <div className="tabular-nums text-[10px] text-muted-foreground">{timer}</div>
      )}

      {/* L5: output (completed only) */}
      {output && (
        <details className="text-xs">
          <summary className="cursor-pointer select-none text-[11px] text-muted-foreground hover:text-foreground">
            {s.output}
            <CopyButton text={output} />
          </summary>
          <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted p-1.5 font-mono text-[10px] leading-relaxed whitespace-pre-wrap">
            {output}
          </pre>
        </details>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SubagentPanel
// ---------------------------------------------------------------------------
export function SubagentPanel({
  activities,
  inheritedModel,
  inheritedEffort,
  className,
}: {
  activities: ReadonlyArray<OrchestrationThreadActivity>;
  inheritedModel?: string;
  inheritedEffort?: string;
  className?: string;
}) {
  const now = useNow();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const { running, completed } = deriveAllSubagents(activities);

  if (running.length === 0 && completed.length === 0) return null;

  const allEntries = [...running, ...completed];
  const model = inheritedModel ?? "thread";
  const effort = inheritedEffort ?? "thread";

  function handleCardClick(id: string) {
    setFocusedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className={cn("border-b border-border bg-muted/10 px-4 py-2 text-xs", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-muted-foreground/70 uppercase tracking-wide">
          {s.title} &middot; {running.length} {s.activos}, {completed.length} {s.concluidos}
        </span>
        <button
          type="button"
          onClick={() => setIsCollapsed((v) => !v)}
          className="rounded p-0.5 text-muted-foreground transition hover:text-foreground"
          title={isCollapsed ? s.expandir : s.colapsar}
        >
          {isCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        </button>
      </div>

      {/* Cards */}
      {!isCollapsed && (
        <div className="flex flex-wrap gap-3 max-h-[40vh] overflow-y-auto">
          {allEntries.map((entry) => (
            <SubagentCard
              key={entry.started.id}
              entry={entry}
              now={now}
              focused={focusedId === entry.started.id}
              dimmed={focusedId !== null && focusedId !== entry.started.id}
              inheritedModel={model}
              inheritedEffort={effort}
              onClick={() => handleCardClick(entry.started.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
