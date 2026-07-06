// Pure onboarding-state predicates. No server imports, so client and server
// components can both use them as the single source of truth.
import type { SyncConfig } from "@/lib/schemas/sync-config";

// True once the user has a live workspace: a non-retired config past onboarding.
// This is what decides "should see dashboard, not onboarding".
export function hasCompletedOnboarding(syncConfigs: SyncConfig[]): boolean {
    return syncConfigs.some(
        (c) => c.syncStatus !== "retired" && c.syncStatus !== "onboarding",
    );
}

// True if the user has any non-retired config. Enforces the one-workspace rule.
export function hasAnyNonRetiredConfig(syncConfigs: SyncConfig[]): boolean {
    return syncConfigs.some((c) => c.syncStatus !== "retired");
}
