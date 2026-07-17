// Shared shape returned to unauthenticated/companion surfaces (Stripe app,
// Google Sheets add-on). Strips spreadsheet IDs, user IDs, and error details —
// only sync-health fields the launcher UIs need.
import type { SyncConfig } from "@/lib/schemas/sync-config";

export type SafeSyncConfig = {
    syncStatus: string;
    lastSyncAt: string | null;
    writerBlocked: boolean;
    writerBlockedReason: string | null;
};

export function toSafeSyncConfig(config: SyncConfig): SafeSyncConfig {
    return {
        syncStatus: config.syncStatus,
        lastSyncAt: config.lastSyncAt,
        writerBlocked: config.writerBlocked,
        writerBlockedReason: config.writerBlockedReason,
    };
}
