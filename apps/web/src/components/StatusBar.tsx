import { AlertTriangle } from "lucide-react";
import { useRateLimits, type NormalizedRateLimit } from "../hooks/useRateLimits";
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
  if (pct >= 85) return "bg-red-500";
  if (pct >= 60) return "bg-amber-500";
  return "bg-emerald-500";
}

function RateBar({ label, rl }: { label: string; rl: NormalizedRateLimit | null }) {
  if (!rl) return null;
  const pct = rl.utilizationPct;
  const alert = rl.status === "allowed_warning" || rl.status === "rejected" || rl.isUsingOverage;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground uppercase tracking-wide">{label}</span>
      <div className="relative h-2 w-24 overflow-hidden rounded-full bg-border">
        <div className={`h-full ${pctColor(pct)}`} style={{ width: `${pct ?? 0}%` }} />
      </div>
      <span className="tabular-nums">{pct != null ? `${pct.toFixed(0)}%` : "-"}</span>
      {rl.resetsAt && <span className="text-muted-foreground">{formatReset(rl.resetsAt)}</span>}
      {alert && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
    </div>
  );
}

export function StatusBar() {
  const { fiveHour, sevenDay, hasAny } = useRateLimits();
  if (!hasAny) return null;
  return (
    <div className="flex items-center gap-6 border-t border-border bg-card px-4 py-1 text-foreground">
      <RateBar label="5h" rl={fiveHour} />
      <RateBar label="7d" rl={sevenDay} />
    </div>
  );
}
