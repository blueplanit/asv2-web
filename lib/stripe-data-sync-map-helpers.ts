import type {
    SyncConfig,
    StripeDataSyncEntry,
    StripeObject,
} from "./schemas/sync-config";
import { buildDefaultStripeDataSyncMap } from "./schemas/sync-config";


export function ensureStripeDataSyncMap(cfg: SyncConfig): StripeDataSyncEntry[] {
    if (cfg.stripeDataSyncMap && cfg.stripeDataSyncMap.length > 0) {
        return cfg.stripeDataSyncMap;
    }
    return buildDefaultStripeDataSyncMap();
}

export function applyStripeSelectionToStripeDataSyncMap(
    stripeDataSyncMap: StripeDataSyncEntry[],
    selectedStripeObjects: StripeObject[],
): StripeDataSyncEntry[] {
    const selected = new Set<StripeObject>(selectedStripeObjects);

    return stripeDataSyncMap.map((entry) => {
        if (entry.kind === "object_table" && entry.primaryStripeObject) {
            return {
                ...entry,
                enabled: selected.has(entry.primaryStripeObject),
            };
        }
        return entry;
    });
}

