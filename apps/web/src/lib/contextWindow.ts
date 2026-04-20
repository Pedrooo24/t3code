import { useMemo } from "react";
import { useParams } from "@tanstack/react-router";
import type { EnvironmentId, OrchestrationThreadActivity, ThreadId, ThreadTokenUsageSnapshot } from "@t3tools/contracts";
import { scopeThreadRef } from "@t3tools/client-runtime";
import { useStore } from "../store";
import { createThreadSelectorByRef } from "../storeSelectors";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

type NullableContextWindowUsage = {
  readonly [Key in keyof ThreadTokenUsageSnapshot]: undefined extends ThreadTokenUsageSnapshot[Key]
    ? Exclude<ThreadTokenUsageSnapshot[Key], undefined> | null
    : ThreadTokenUsageSnapshot[Key];
};

export type ContextWindowSnapshot = NullableContextWindowUsage & {
  readonly remainingTokens: number | null;
  readonly usedPercentage: number | null;
  readonly remainingPercentage: number | null;
  readonly estimatedCostUsd: number | null;
  readonly lastTurnCostUsd: number | null;
  readonly updatedAt: string;
};

export function deriveLatestContextWindowSnapshot(
  activities: ReadonlyArray<OrchestrationThreadActivity>,
): ContextWindowSnapshot | null {
  for (let index = activities.length - 1; index >= 0; index -= 1) {
    const activity = activities[index];
    if (!activity || activity.kind !== "context-window.updated") {
      continue;
    }

    const payload = asRecord(activity.payload);
    const usedTokens = asFiniteNumber(payload?.usedTokens);
    if (usedTokens === null || usedTokens <= 0) {
      continue;
    }

    const maxTokens = asFiniteNumber(payload?.maxTokens);
    const usedPercentage =
      maxTokens !== null && maxTokens > 0 ? Math.min(100, (usedTokens / maxTokens) * 100) : null;
    const remainingTokens =
      maxTokens !== null ? Math.max(0, Math.round(maxTokens - usedTokens)) : null;
    const remainingPercentage = usedPercentage !== null ? Math.max(0, 100 - usedPercentage) : null;

    return {
      usedTokens,
      totalProcessedTokens: asFiniteNumber(payload?.totalProcessedTokens),
      maxTokens,
      remainingTokens,
      usedPercentage,
      remainingPercentage,
      inputTokens: asFiniteNumber(payload?.inputTokens),
      cachedInputTokens: asFiniteNumber(payload?.cachedInputTokens),
      outputTokens: asFiniteNumber(payload?.outputTokens),
      reasoningOutputTokens: asFiniteNumber(payload?.reasoningOutputTokens),
      lastUsedTokens: asFiniteNumber(payload?.lastUsedTokens),
      lastInputTokens: asFiniteNumber(payload?.lastInputTokens),
      lastCachedInputTokens: asFiniteNumber(payload?.lastCachedInputTokens),
      lastOutputTokens: asFiniteNumber(payload?.lastOutputTokens),
      lastReasoningOutputTokens: asFiniteNumber(payload?.lastReasoningOutputTokens),
      toolUses: asFiniteNumber(payload?.toolUses),
      durationMs: asFiniteNumber(payload?.durationMs),
      compactsAutomatically: asBoolean(payload?.compactsAutomatically) ?? false,
      estimatedCostUsd: asFiniteNumber(payload?.estimatedCostUsd),
      lastTurnCostUsd: asFiniteNumber(payload?.lastTurnCostUsd),
      updatedAt: activity.createdAt,
    };
  }

  return null;
}

export function formatContextWindowTokens(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "0";
  }
  if (value < 1_000) {
    return `${Math.round(value)}`;
  }
  if (value < 10_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  if (value < 1_000_000) {
    return `${Math.round(value / 1_000)}k`;
  }
  return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
}

export interface SessionCostTotal {
  estimatedCostUsd: number | null;
  usedTokens: number | null;
}

/**
 * Aggregates cost and token usage from the active thread's latest context-window snapshot.
 * Returns nulls when no thread is active or no snapshot exists yet.
 */
export function useSessionCostTotal(): SessionCostTotal {
  const environmentId = useParams({
    strict: false,
    select: (params) => params.environmentId,
  });
  const threadId = useParams({
    strict: false,
    select: (params) => params.threadId,
  });
  const routeThreadRef = useMemo(
    () =>
      environmentId && threadId
        ? scopeThreadRef(environmentId as EnvironmentId, threadId as ThreadId)
        : null,
    [environmentId, threadId],
  );
  const threadSelector = useMemo(
    () => createThreadSelectorByRef(routeThreadRef),
    [routeThreadRef],
  );
  const thread = useStore(threadSelector);
  const snapshot = useMemo(
    () => deriveLatestContextWindowSnapshot(thread?.activities ?? []),
    [thread?.activities],
  );
  return {
    estimatedCostUsd: snapshot?.estimatedCostUsd ?? null,
    usedTokens: snapshot?.usedTokens ?? null,
  };
}
