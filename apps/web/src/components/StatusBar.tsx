import { AlertTriangle } from "lucide-react";
import { useRateLimits, type NormalizedRateLimit } from "../hooks/useRateLimits";
import { useSessionCostTotal } from "../lib/contextWindow";
import { strings } from "../strings";

function formatReset(resetsAt: number | null): string {
  if (!resetsAt) return "";
  const now = Date.now();
  const ms = resetsAt * 1000 - now;
  if (ms <= 0) return strings.status.resetPending;
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return strings.status.resetsInMinutes(mins);
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return strings.status.resetsInHours(hours, remMins);
}

function pctColor(pct: number | null): string {
  if (pct == null) return "bg-muted";
  if (pct >= 85) return "bg-danger";
  if (pct >= 60) return "bg-warning";
  return "bg-teal-500";
}

function formatCost(v: number | null): string | null {
  return v == null ? null : `$${v.toFixed(2)}`;
}

function formatTokens(v: number | null): string | null {
  if (v == null) return null;
  if (v < 1_000) return `${Math.round(v)}`;
  if (v < 1_000_000) return `${Math.round(v / 1_000)}k`;
  return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
}

interface RateBarProps {
  label: string;
  rl: NormalizedRateLimit | null;
  hasEverReceivedData: boolean;
  compact?: boolean;
}

function RateBar({ label, rl, hasEverReceivedData, compact }: RateBarProps) {
  const pct = rl?.utilizationPct ?? null;
  const alert = rl && (rl.status === "allowed_warning" || rl.status === "rejected" || rl.isUsingOverage);
  const noData = !hasEverReceivedData;

  if (compact) {
    return (
      <span className="tabular-nums text-xs text-muted-foreground">
        {label}{" "}
        {noData ? (
          <span title={strings.status.noDataTooltip} className="cursor-help">
            {strings.status.noData}
          </span>
        ) : (
          <span className={pct != null && pct >= 60 ? "text-warning" : pct != null && pct >= 85 ? "text-danger" : ""}>
            {pct != null ? `${pct.toFixed(0)}%` : strings.status.noData}
          </span>
        )}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground uppercase tracking-wide">{label}</span>
      <div className="relative h-2 w-24 overflow-hidden rounded-full bg-border">
        <div
          className={`h-full transition-all duration-500 ${pctColor(pct)}`}
          style={{ width: noData ? "0%" : `${pct ?? 0}%` }}
        />
      </div>
      {noData ? (
        <span
          title={strings.status.noDataTooltip}
          className="cursor-help tabular-nums text-muted-foreground"
        >
          {strings.status.noData}
        </span>
      ) : (
        <span className="tabular-nums">{pct != null ? `${pct.toFixed(0)}%` : strings.status.noData}</span>
      )}
      {rl?.resetsAt && !noData && (
        <span className="text-muted-foreground">{formatReset(rl.resetsAt)}</span>
      )}
      {alert && <AlertTriangle className="h-3.5 w-3.5 text-danger" />}
    </div>
  );
}

export function StatusBar() {
  const { fiveHour, sevenDay, hasEverReceivedData } = useRateLimits();
  const { estimatedCostUsd, usedTokens } = useSessionCostTotal();

  const costStr = formatCost(estimatedCostUsd);
  const tokensStr = formatTokens(usedTokens);
  const hasSessionData = costStr !== null || tokensStr !== null;

  return (
    <div className="border-t border-border bg-card px-4 py-1 text-foreground">
      {/* Full layout - visible at md+ */}
      <div className="hidden md:flex items-center gap-6">
        <RateBar
          label={strings.status.rateLimitLabel5h}
          rl={fiveHour}
          hasEverReceivedData={hasEverReceivedData}
        />
        <RateBar
          label={strings.status.rateLimitLabel7d}
          rl={sevenDay}
          hasEverReceivedData={hasEverReceivedData}
        />
        {hasSessionData && (
          <>
            <span className="h-3 w-px bg-border" aria-hidden />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="uppercase tracking-wide">{strings.status.session}</span>
              <span className="tabular-nums text-foreground">
                {costStr ?? strings.status.noData}
                {tokensStr && (
                  <span className="ml-1.5 text-muted-foreground">· {tokensStr} tokens</span>
                )}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Compact layout - visible below md */}
      <div className="flex md:hidden items-center gap-3 text-xs text-muted-foreground">
        <RateBar
          label={strings.status.rateLimitLabel5h}
          rl={fiveHour}
          hasEverReceivedData={hasEverReceivedData}
          compact
        />
        <span aria-hidden>·</span>
        <RateBar
          label={strings.status.rateLimitLabel7d}
          rl={sevenDay}
          hasEverReceivedData={hasEverReceivedData}
          compact
        />
        {costStr && (
          <>
            <span aria-hidden>·</span>
            <span className="tabular-nums">{costStr}</span>
          </>
        )}
      </div>
    </div>
  );
}
