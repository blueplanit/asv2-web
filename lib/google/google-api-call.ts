// lib/google/google-api-call.ts
import "server-only";
import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import {
    getGoogleAccessTokenForUser,
    GoogleAuthRevokedError,
    markGoogleConnectionIncident,
} from "./google-auth";
import { getGoogleClientConfigForShard, GOOGLE_DEFAULT_PROJECT_SHARD } from "./google-oauth-sharding";
import type { UserState } from "../app-state/user-state";
import { userPk, googleConnectSk } from "@blueplanit/asv2-shared";

function isUnauthorized(err: unknown): boolean {
    return (err as any)?.response?.status === 401;
}

function buildOAuth2Client(accessToken: string, projectShard: string): OAuth2Client {
    const { clientId, clientSecret } = getGoogleClientConfigForShard(projectShard);
    const client = new google.auth.OAuth2(clientId, clientSecret);
    client.setCredentials({ access_token: accessToken });
    return client;
}

/**
 * Executes a Google API call with automatic token refresh and revocation detection.
 *
 * On 401: force-refreshes the access token and retries once.
 *   - If the force-refresh itself fails with invalid_grant → throws GoogleAuthRevokedError
 *     (connection already marked "revoked" in DynamoDB by getGoogleAccessTokenForUser).
 *   - If the retry also returns 401 (scopes removed without revoking the refresh token)
 *     → marks the connection "revoked" in DynamoDB and throws GoogleAuthRevokedError.
 */
export async function callGoogleApi<T>(
    userState: UserState,
    fn: (client: OAuth2Client) => Promise<T>,
): Promise<T> {
    const userId = userState.profile?.userId;
    const googleUserId = userState.profile?.googleUserId;
    if (!userId || !googleUserId) throw new Error("User or Google user ID not found");

    const projectShard =
        userState.googleConnections.find((c) => c.googleUserId === googleUserId)?.googleProjectShard ??
        GOOGLE_DEFAULT_PROJECT_SHARD;

    const { accessToken } = await getGoogleAccessTokenForUser(userState);

    try {
        return await fn(buildOAuth2Client(accessToken, projectShard));
    } catch (err) {
        if (err instanceof GoogleAuthRevokedError) throw err;
        if (!isUnauthorized(err)) throw err;

        // 401 from the API: the cached access token is dead even though it hadn't expired.
        // Force-refresh and retry once. getGoogleAccessTokenForUser throws GoogleAuthRevokedError
        // if the refresh token is invalid (invalid_grant).
        const { accessToken: freshToken } = await getGoogleAccessTokenForUser(userState, { forceRefresh: true });

        try {
            return await fn(buildOAuth2Client(freshToken, projectShard));
        } catch (retryErr) {
            if (!isUnauthorized(retryErr)) throw retryErr;
            // Second 401 after a successful token refresh: scopes were removed but the
            // refresh token is still technically valid. Mark the connection as revoked.
            await markGoogleConnectionIncident({
                pk: userPk(userId),
                sk: googleConnectSk(googleUserId),
                status: "revoked",
                errorCode: "refresh_invalid",
                errorMessage: "API returned 401 after successful token refresh — scopes likely removed",
            });
            throw new GoogleAuthRevokedError("Google API returned 401 after token refresh");
        }
    }
}
