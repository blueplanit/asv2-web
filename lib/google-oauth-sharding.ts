// lib/google-oauth-sharding.ts
import "server-only";
// server-only helper for choosing shard + client config

export const GOOGLE_DEFAULT_PROJECT_SHARD =
    process.env.GOOGLE_DEFAULT_PROJECT_SHARD ?? "gcp-0";

// In future: hash userId → shard; for now always default shard.
// THIS IS ONLY USED FOR SIGNUP !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
export function selectGoogleProjectShardForUser(userId: string): string {
    // TODO: hash userId → shard; for now always default shard.
    return GOOGLE_DEFAULT_PROJECT_SHARD;
}

// Client config per shard; for now only one shard/client.
// Later: switch on `shard` and return different client configs.
export function getGoogleClientConfigForShard(shard: string): {
    clientId: string;
    clientSecret: string;
} {
    // TODO: switch on `shard` and return different client configs.
    if (shard === GOOGLE_DEFAULT_PROJECT_SHARD) {
        const clientId = process.env.GOOGLE_CLIENT_ID!;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
        if (!clientId || !clientSecret) {
            throw new Error("Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET");
        }
        return { clientId, clientSecret };
    }

    throw new Error(`No Google OAuth client configured for shard ${shard}`);
}