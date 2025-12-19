import type {
    SyncConfig,
    StripeDataSyncEntry,
    DataSyncEntryId,
} from "./schemas/sync-config";
import { buildDefaultStripeDataSyncMap } from "./schemas/sync-config";
import { getLatestSchemaVersion } from "@blueplanit/asv2-shared";


export function ensureStripeDataSyncMap(cfg: SyncConfig): StripeDataSyncEntry[] {
    if (cfg.stripeDataSyncMap && cfg.stripeDataSyncMap.length > 0) {
        return cfg.stripeDataSyncMap;
    }
    return buildDefaultStripeDataSyncMap();
}

export function applyStripeSelectionToStripeDataSyncMap(
    stripeDataSyncMap: StripeDataSyncEntry[],
    selectedDataSyncEntries: DataSyncEntryId[],
): StripeDataSyncEntry[] {
    const selected = new Set<DataSyncEntryId>(selectedDataSyncEntries);

    return stripeDataSyncMap.map((entry) => {
        if (entry.kind === "object_table" && entry.id) {
            const latestSchemaVersion = getLatestSchemaVersion(entry.id);
            return {
                ...entry,
                enabled: selected.has(entry.id),
                schemaVersion: latestSchemaVersion,
            };
        }
        return entry;
    });
}

