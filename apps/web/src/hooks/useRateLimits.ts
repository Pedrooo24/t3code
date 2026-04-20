import { useAtomValue } from "@effect/atom-react";
import { type SDKRateLimitInfoPayload } from "@t3tools/contracts";
import { rateLimitsAtom } from "../rpc/serverState";

export interface NormalizedRateLimit {
  rateLimitType: string;
  utilizationPct: number | null;
  status: SDKRateLimitInfoPayload["status"];
  resetsAt: number | null;
  isUsingOverage: boolean;
  overageStatus: SDKRateLimitInfoPayload["overageStatus"];
  raw: SDKRateLimitInfoPayload;
}

let maxObservedUtilization = 0;

function normalizeUtilization(u: number | undefined): number | null {
  if (typeof u !== "number") return null;
  maxObservedUtilization = Math.max(maxObservedUtilization, u);
  const pct = maxObservedUtilization <= 1 ? u * 100 : u;
  return Math.max(0, Math.min(100, pct));
}

export function useRateLimits(): {
  fiveHour: NormalizedRateLimit | null;
  sevenDay: NormalizedRateLimit | null;
  hasAny: boolean;
  hasEverReceivedData: boolean;
} {
  const all = useAtomValue(rateLimitsAtom);

  const pick = (key: string): NormalizedRateLimit | null => {
    const info = all[key];
    if (!info) return null;
    return {
      rateLimitType: key,
      utilizationPct: normalizeUtilization(info.utilization),
      status: info.status,
      resetsAt: info.resetsAt ?? null,
      isUsingOverage: info.isUsingOverage ?? false,
      overageStatus: info.overageStatus,
      raw: info,
    };
  };

  const fiveHour = pick("five_hour");
  const sevenDay = pick("seven_day") ?? pick("seven_day_opus") ?? pick("seven_day_sonnet");
  const hasAny = Boolean(fiveHour || sevenDay);
  // hasEverReceivedData: true when the atom has at least one key (even if utilization is 0)
  const hasEverReceivedData = Object.keys(all).length > 0;

  return { fiveHour, sevenDay, hasAny, hasEverReceivedData };
}
