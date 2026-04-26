"use client";

import { useState, useRef, useMemo } from "react";
import {
  Bot,
  Plug,
  Puzzle,
  Terminal,
  Pencil,
  Eye,
  Globe,
  Zap,
  Clock,
} from "lucide-react";
import type { OrchestrationThreadActivity } from "@t3tools/contracts";
import { cn } from "~/lib/utils";
import {
  Sheet,
  SheetPopup,
  SheetHeader,
  SheetTitle,
  SheetPanel,
} from "~/components/ui/sheet";
import {
  classifyToolCall,
  subagentDescriptor,
  groupActivitiesBySubagent,
  extractFinalAgentResponse,
  type ToolCallKind,
} from "~/session-logic";
import { strings } from "~/strings";

const s = strings.agentInspector;
const ss = strings.subagents;

// ---------------------------------------------------------------------------
// Icon map by tool kind
// ---------------------------------------------------------------------------

function toolKindIcon(kind: ToolCallKind) {
  switch (kind) {
    case "mcp":
      return { Icon: Plug, className: "text-teal-500 dark:text-teal-400" };
    case "skill":
      return { Icon: Puzzle, className: "text-violet-500 dark:text-violet-400" };
    case "agent":
      return { Icon: Bot, className: "text-emerald-500 dark:text-emerald-400" };
    case "bash":
      return { Icon: Terminal, className: "text-muted-foreground/70" };
    case "edit":
      return { Icon: Pencil, className: "text-amber-500 dark:text-amber-400" };
    case "read":
      return { Icon: Eye, className: "text-muted-foreground/50" };
    case "web":
      return { Icon: Globe, className: "text-muted-foreground/70" };
    default:
      return { Icon: Zap, className: "text-muted-foreground/50" };
  }
}

// ---------------------------------------------------------------------------
// Duration helpers
// ---------------------------------------------------------------------------

function formatDurationMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return secs > 0 ? `${m}m ${secs}s` : `${m}m`;
}

function calcDuration(started: OrchestrationThreadActivity, completed: OrchestrationThreadActivity | null): string | null {
  if (!completed) return null;
  const s = Date.parse(started.createdAt);
  const e = Date.parse(completed.createdAt);
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return null;
  return formatDurationMs(e - s);
}

// ---------------------------------------------------------------------------
// Payload helpers
// ---------------------------------------------------------------------------

function payloadItemType(a: OrchestrationThreadActivity): string | undefined {
  const p = a.payload as Record<string, unknown> | null | undefined;
  const t = p?.itemType;
  return typeof t === "string" ? t : undefined;
}

const SUBAGENT_ITEM_TYPES = new Set(["collab_agent_tool_call", "dynamic_tool_call"]);

function isSubagentActivity(a: OrchestrationThreadActivity): boolean {
  return SUBAGENT_ITEM_TYPES.has(payloadItemType(a) ?? "");
}

// ---------------------------------------------------------------------------
// Tab component
// ---------------------------------------------------------------------------

type TabKey = "conversa" | "resumo";

function Tabs({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (t: TabKey) => void;
}) {
  return (
    <div className="flex border-b border-border">
      {(["conversa", "resumo"] as TabKey[]).map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={cn(
            "px-4 py-2 text-xs font-medium capitalize transition-colors",
            active === tab
              ? "border-b-2 border-teal-500 text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab === "conversa" ? s.conversa : s.resumo}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline entry row
// ---------------------------------------------------------------------------

function TimelineRow({ activity }: { activity: OrchestrationThreadActivity }) {
  const cls = classifyToolCall(activity);
  const { Icon, className: iconClass } = toolKindIcon(cls.kind);

  const isThinking = activity.kind === "task.progress";
  const [expanded, setExpanded] = useState(false);

  const detail = (() => {
    const p = activity.payload as Record<string, unknown> | null | undefined;
    return typeof p?.detail === "string" ? p.detail : null;
  })();

  const content = detail || activity.summary;
  const lines = content.split("\n");
  const isLong = lines.length > 2 || content.length > 160;

  if (isThinking) {
    return (
      <div className="rounded-md border border-border/30 bg-muted/10 px-2 py-1.5 text-[11px]">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50">
            Thinking
          </span>
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-[9px] uppercase tracking-wide text-muted-foreground/50 hover:text-foreground/70"
            >
              {expanded ? "Colapsar" : "Expandir"}
            </button>
          )}
        </div>
        <p
          className={cn("whitespace-pre-wrap leading-5 text-muted-foreground/60")}
          style={
            !expanded && isLong
              ? {
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }
              : undefined
          }
        >
          {content}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 py-0.5">
      <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center", iconClass)}>
        <Icon className="size-3" />
      </span>
      <div className="min-w-0 flex-1">
        <span className="text-[11px] text-muted-foreground/80 truncate">{cls.label}</span>
        {detail && detail !== activity.summary && (
          <p
            className={cn("mt-0.5 whitespace-pre-wrap text-[10px] text-muted-foreground/50 leading-relaxed")}
            style={
              !expanded && isLong
                ? {
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }
                : undefined
            }
          >
            {detail}
          </p>
        )}
      </div>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-[9px] uppercase tracking-wide text-muted-foreground/40 hover:text-foreground/60"
        >
          {expanded ? "-" : "+"}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conversa tab
// ---------------------------------------------------------------------------

function ConversaTab({
  prompt,
  activities,
  finalResponse,
}: {
  prompt: string | null;
  activities: OrchestrationThreadActivity[];
  finalResponse: string | null;
}) {
  const relevant = activities
    .filter(
      (a) =>
        a.kind !== "context-window.updated" &&
        a.summary !== "Checkpoint captured" &&
        a.kind !== "task.started",
    )
    .sort((a, b) => {
      const ta = Date.parse(a.createdAt);
      const tb = Date.parse(b.createdAt);
      if (!Number.isNaN(ta) && !Number.isNaN(tb)) return ta - tb;
      return 0;
    });

  return (
    <div className="space-y-3 py-2">
      {/* Prompt inicial */}
      <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
        <p className="mb-1 text-[9px] uppercase tracking-widest text-muted-foreground/50">
          {s.promptRecebido}
        </p>
        {prompt ? (
          <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-foreground/80">
            {prompt}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground/40 italic">{s.semPrompt}</p>
        )}
      </div>

      {/* Timeline de actividades */}
      {relevant.length > 0 && (
        <div className="space-y-1">
          {relevant.map((a) => (
            <TimelineRow key={a.id} activity={a} />
          ))}
        </div>
      )}

      {/* Resposta final */}
      <div
        className={cn(
          "rounded-lg border p-3",
          finalResponse
            ? "border-violet-500/30 bg-violet-500/5"
            : "border-border/30 bg-muted/10",
        )}
      >
        <p className="mb-1 text-[9px] uppercase tracking-widest text-muted-foreground/50">
          {s.respostaEntregue}
        </p>
        {finalResponse ? (
          <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-foreground/80">
            {finalResponse}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground/40 italic">{s.semResposta}</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resumo tab
// ---------------------------------------------------------------------------

interface ResumoStats {
  mcpsByServer: Map<string, number>;
  skills: string[];
  totalTools: number;
  files: string[];
  bashCommands: string[];
}

function buildResumoStats(activities: OrchestrationThreadActivity[]): ResumoStats {
  const mcpsByServer = new Map<string, number>();
  const skills: string[] = [];
  let totalTools = 0;
  const files: string[] = [];
  const bashCommands: string[] = [];

  for (const a of activities) {
    if (a.kind !== "tool.started" && a.kind !== "tool.completed") continue;
    const cls = classifyToolCall(a);

    if (cls.kind === "mcp") {
      const count = mcpsByServer.get(cls.server ?? "mcp") ?? 0;
      mcpsByServer.set(cls.server ?? "mcp", count + 1);
      totalTools++;
    } else if (cls.kind === "skill") {
      if (!skills.includes(cls.label)) skills.push(cls.label);
      totalTools++;
    } else if (cls.kind === "edit") {
      const p = a.payload as Record<string, unknown> | null | undefined;
      const d = p?.data as Record<string, unknown> | null | undefined;
      const changed = d?.changedFiles;
      if (Array.isArray(changed)) {
        for (const f of changed) {
          if (typeof f === "string" && !files.includes(f)) files.push(f);
        }
      }
      totalTools++;
    } else if (cls.kind === "bash") {
      const p = a.payload as Record<string, unknown> | null | undefined;
      const cmd = typeof p?.detail === "string" ? p.detail.slice(0, 80) : null;
      if (cmd && !bashCommands.includes(cmd)) bashCommands.push(cmd);
      totalTools++;
    } else if (cls.kind !== "agent") {
      totalTools++;
    }
  }

  return { mcpsByServer, skills, totalTools, files, bashCommands };
}

function ResumoTab({ activities }: { activities: OrchestrationThreadActivity[] }) {
  const stats = useMemo(() => buildResumoStats(activities), [activities]);

  const hasAny =
    stats.mcpsByServer.size > 0 ||
    stats.skills.length > 0 ||
    stats.totalTools > 0 ||
    stats.files.length > 0 ||
    stats.bashCommands.length > 0;

  if (!hasAny) {
    return (
      <div className="py-6 text-center text-[12px] text-muted-foreground/50">
        {s.semActividade}
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      {/* MCPs por servidor */}
      {stats.mcpsByServer.size > 0 && (
        <section>
          <h3 className="mb-1.5 text-[9px] uppercase tracking-widest text-muted-foreground/50">
            {s.mcps} · {s.servidores}
          </h3>
          <div className="space-y-1">
            {[...stats.mcpsByServer.entries()].map(([server, count]) => (
              <div key={server} className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
                  <Plug className="size-3" />
                  {server}
                </span>
                <span className="tabular-nums text-muted-foreground/60">{count}x</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {stats.skills.length > 0 && (
        <section>
          <h3 className="mb-1.5 text-[9px] uppercase tracking-widest text-muted-foreground/50">
            {s.skills}
          </h3>
          <div className="flex flex-wrap gap-1">
            {stats.skills.map((sk) => (
              <span
                key={sk}
                className="rounded border border-violet-500/25 bg-violet-500/8 px-1.5 py-0.5 text-[10px] text-violet-600 dark:text-violet-400"
              >
                {sk}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Tool calls totais */}
      {stats.totalTools > 0 && (
        <section>
          <h3 className="mb-1 text-[9px] uppercase tracking-widest text-muted-foreground/50">
            {s.tools}
          </h3>
          <p className="text-[12px] tabular-nums text-foreground/70">{stats.totalTools}</p>
        </section>
      )}

      {/* Ficheiros tocados */}
      {stats.files.length > 0 && (
        <section>
          <h3 className="mb-1.5 text-[9px] uppercase tracking-widest text-muted-foreground/50">
            {s.ficheiros}
          </h3>
          <div className="space-y-0.5">
            {stats.files.slice(0, 10).map((f) => (
              <p key={f} className="truncate font-mono text-[10px] text-muted-foreground/70">
                {f}
              </p>
            ))}
            {stats.files.length > 10 && (
              <p className="text-[10px] text-muted-foreground/40">
                +{stats.files.length - 10} mais
              </p>
            )}
          </div>
        </section>
      )}

      {/* Bash commands */}
      {stats.bashCommands.length > 0 && (
        <section>
          <h3 className="mb-1.5 text-[9px] uppercase tracking-widest text-muted-foreground/50">
            {s.comandos}
          </h3>
          <div className="space-y-0.5">
            {stats.bashCommands.slice(0, 8).map((cmd, i) => (
              <p
                key={i}
                className="truncate rounded bg-muted/30 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/70"
              >
                {cmd}
              </p>
            ))}
            {stats.bashCommands.length > 8 && (
              <p className="text-[10px] text-muted-foreground/40">
                +{stats.bashCommands.length - 8} mais
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main drawer component
// ---------------------------------------------------------------------------

export interface AgentInspectorDrawerProps {
  open: boolean;
  activityId: string | null;
  activities: ReadonlyArray<OrchestrationThreadActivity>;
  inheritedModel: string | null;
  inheritedEffort: string | null;
  onClose: () => void;
}

export function AgentInspectorDrawer({
  open,
  activityId,
  activities,
  inheritedModel,
  inheritedEffort,
  onClose,
}: AgentInspectorDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("conversa");
  const scrollRef = useRef<Map<string, number>>(new Map());

  // Find the started activity for this agent
  const startedActivity = useMemo(
    () => (activityId ? activities.find((a) => a.id === activityId) ?? null : null),
    [activityId, activities],
  );

  // Correlate completed activity via toolCallId
  const completedActivity = useMemo(() => {
    if (!startedActivity) return null;
    const p = startedActivity.payload as Record<string, unknown> | null | undefined;
    const data = p?.data as Record<string, unknown> | null | undefined;
    const callId = typeof data?.toolCallId === "string" ? data.toolCallId : null;
    if (!callId) return null;
    return (
      activities.find((a) => {
        if (a.kind !== "tool.completed" || !isSubagentActivity(a)) return false;
        const ap = a.payload as Record<string, unknown> | null | undefined;
        const ad = ap?.data as Record<string, unknown> | null | undefined;
        return ad?.toolCallId === callId;
      }) ?? null
    );
  }, [startedActivity, activities]);

  const descriptor = useMemo(
    () => (startedActivity ? subagentDescriptor(startedActivity) : null),
    [startedActivity],
  );

  const agentName = descriptor?.subagentType ?? "subagent";
  const realModel = descriptor?.model && descriptor.model !== "inherit" ? descriptor.model : null;
  const displayModel = realModel ?? inheritedModel ?? "thread";
  const modelIsInherited = !realModel;
  const realEffort = descriptor?.effort && descriptor.effort !== "inherit" ? descriptor.effort : null;
  const displayEffort = realEffort ?? inheritedEffort ?? null;

  const duration = useMemo(
    () => (startedActivity ? calcDuration(startedActivity, completedActivity) : null),
    [startedActivity, completedActivity],
  );

  // Activities belonging to this subagent (by parentToolUseId)
  const grouped = useMemo(() => groupActivitiesBySubagent(activities), [activities]);

  const p = startedActivity?.payload as Record<string, unknown> | null | undefined;
  const data = p?.data as Record<string, unknown> | null | undefined;
  const callId = typeof data?.toolCallId === "string" ? data.toolCallId : null;
  const subagentActivities = useMemo(
    () => (callId ? (grouped.get(callId) ?? []) : []),
    [callId, grouped],
  );

  const finalResponse = useMemo(
    () => (callId ? extractFinalAgentResponse(callId, activities) : null),
    [callId, activities],
  );

  // Pill counts for header
  const headerPills = useMemo(() => {
    let mcps = 0;
    let skills = 0;
    let tools = 0;
    for (const a of subagentActivities) {
      if (a.kind !== "tool.started" && a.kind !== "tool.completed") continue;
      const cls = classifyToolCall(a);
      if (cls.kind === "mcp") mcps++;
      else if (cls.kind === "skill") skills++;
      else if (cls.kind !== "agent") tools++;
    }
    return { mcps, skills, tools };
  }, [subagentActivities]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) onClose();
  }

  if (!open && !activityId) return null;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetPopup side="right" className="w-[480px] max-w-[90vw] flex flex-col">
        <SheetHeader className="border-b border-border pb-3">
          {/* Agent name */}
          <div className="flex items-center gap-2 pr-8">
            <Bot size={15} className="shrink-0 text-emerald-500 dark:text-emerald-400" />
            <SheetTitle className="text-sm font-semibold truncate">{agentName}</SheetTitle>
          </div>

          {/* Model + effort + flags */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center rounded border border-teal-600/30 bg-teal-600/8 px-1.5 py-0.5 text-[10px] text-teal-600 dark:text-teal-400">
              {displayModel}
              {modelIsInherited && (
                <span className="ml-1 opacity-60">· {ss.herdadoDaThread}</span>
              )}
            </span>
            {displayEffort && (
              <span className="inline-flex items-center rounded border border-teal-600/20 bg-teal-600/5 px-1.5 py-0.5 text-[10px] text-teal-500 dark:text-teal-400/80">
                {displayEffort}
              </span>
            )}
            {descriptor?.runInBackground && (
              <span className="rounded border border-border/50 bg-muted/30 px-1.5 py-0.5 text-[9px] text-muted-foreground/60 uppercase tracking-wide">
                {s.background}
              </span>
            )}
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground/60">
            {duration && (
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {duration}
              </span>
            )}
            {headerPills.mcps > 0 && (
              <span className="text-teal-600 dark:text-teal-400">
                {s.mcps} · {headerPills.mcps}
              </span>
            )}
            {headerPills.skills > 0 && (
              <span className="text-violet-500 dark:text-violet-400">
                {s.skills} · {headerPills.skills}
              </span>
            )}
            {headerPills.tools > 0 && (
              <span>
                {s.tools} · {headerPills.tools}
              </span>
            )}
          </div>
        </SheetHeader>

        {/* Tabs */}
        <Tabs active={activeTab} onChange={setActiveTab} />

        {/* Content */}
        <SheetPanel
          className="flex-1"
          ref={(el) => {
            if (el && activityId) {
              const saved = scrollRef.current.get(activityId);
              if (saved != null) el.scrollTop = saved;
            }
          }}
          onScroll={(e) => {
            if (activityId) {
              scrollRef.current.set(activityId, (e.target as HTMLElement).scrollTop);
            }
          }}
        >
          {activeTab === "conversa" ? (
            <ConversaTab
              prompt={descriptor?.prompt ?? null}
              activities={subagentActivities}
              finalResponse={finalResponse}
            />
          ) : (
            <ResumoTab activities={subagentActivities} />
          )}
        </SheetPanel>
      </SheetPopup>
    </Sheet>
  );
}
