// lib/google/google-auth.ts (server-only)
import "server-only";
import { ddb } from "../dynamo";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
    type StoredAccessPayload,
    type StoredRefreshPayload,
    createTokenCipher,
    parseKeyringJson,
    googleConnectionAad,
} from "@blueplanit/asv2-shared";
import { getGoogleClientConfigForShard } from "./google-oauth-sharding";
import { UserState } from "../app-state/user-state";
import { getGoogleConnection } from "./google-connection";
import { errorSyncConfigsForGoogleIncident } from "../dynamo/sync-config";
import {
    userPk,
    googleConnectSk,
} from "@blueplanit/asv2-shared";

const TABLE_NAME = process.env.DYNAMO_TABLE_NAME!;
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const TOKEN_CIPHER_KEYRING_JSON = process.env.ASV2_TOKEN_CIPHER_KEYRING_JSON!;
if (!TOKEN_CIPHER_KEYRING_JSON) {
  throw new Error("Missing ASV2_TOKEN_CIPHER_KEYRING_JSON");
}
const tokenCipher = createTokenCipher(parseKeyringJson(TOKEN_CIPHER_KEYRING_JSON));

export class GoogleAuthRevokedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "GoogleAuthRevokedError";
    }
}

export async function markGoogleConnectionIncident(args: {
    pk: string;
    sk: string;
    status: "error" | "revoked";
    errorCode: "refresh_invalid" | "unknown";
    errorMessage?: string;
}) {
    const now = new Date().toISOString();
    await ddb.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: args.pk, sk: args.sk },
        UpdateExpression: "SET #status = :status, errorCode = :errorCode, errorMessage = :msg, lastErrorAt = :at, updatedAt = :now",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
            ":status": args.status,
            ":errorCode": args.errorCode,
            ":msg": args.errorMessage ?? null,
            ":at": now,
            ":now": now,
        },
    }));
}

function parseGoogleTokenError(text: string): { error?: string; error_description?: string } {
    try {
        const j = JSON.parse(text) as any;
        return { error: j?.error, error_description: j?.error_description };
    } catch {
        return {};
    }
}

// Assumes exactly one GoogleConnection per user for now
export async function getGoogleAccessTokenForUser(userState: UserState, opts?: { forceRefresh?: boolean }): Promise<{
    accessToken: string;
    googleUserId: string;
    email: string;
    clientId: string;
    clientSecret: string;
}> {
    const userId = userState.profile?.userId;
    const googleUserId = userState.profile?.googleUserId;
    if (!userId) throw new Error("User ID not found");
    if (!googleUserId) throw new Error("Google user ID not found");

    // 1) Load the exact GoogleConnection for the login Google user
    const item = await getGoogleConnection(userId, googleUserId);
    if (!item) throw new Error("Google connection not found");

    // 2) Use the shard from the connection (stable)
    const googleProjectShard = item.googleProjectShard;
    const { clientId, clientSecret } = getGoogleClientConfigForShard(googleProjectShard);
    const pk = userPk(userId);
    const sk = googleConnectSk(googleUserId);

    const aad = googleConnectionAad(item);

    let accessPayload: StoredAccessPayload;
    let refreshPayload: StoredRefreshPayload;

    try {
        accessPayload = await tokenCipher.decrypt<StoredAccessPayload>(
            item.accessTokenEncrypted,
            { purpose: "google_access_v1", aad },
        );
        refreshPayload = await tokenCipher.decrypt<StoredRefreshPayload>(
            item.refreshTokenEncrypted,
            { purpose: "google_refresh_v1", aad },
        );
    } catch (e: any) {
        await markGoogleConnectionIncident({
            pk: pk,
            sk: sk,
            status: "error",
            errorCode: "unknown",
            errorMessage: "Failed to decrypt stored Google tokens",
        });
        await errorSyncConfigsForGoogleIncident(userId, googleUserId, "Google account authentication error — please reconnect your Google account").catch(() => {});
        throw e;
    }

    let { accessToken, expiresAt } = accessPayload;
    const { refreshToken } = refreshPayload;

    const now = Date.now();
    const aboutToExpire =
        typeof expiresAt === "number" && expiresAt - now < 60_000; // 60s buffer

    if (!accessToken || aboutToExpire || opts?.forceRefresh) {
        // 2) Refresh access token
        const body = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
        });

        const tokenRes = await fetch(GOOGLE_TOKEN_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
        });

        if (!tokenRes.ok) {
            const txt = await tokenRes.text();
            const parsed = parseGoogleTokenError(txt);
            const msg = parsed.error_description || parsed.error || txt || `HTTP ${tokenRes.status}`;

            // invalid_grant is the canonical “refresh token dead” signal
            if ((parsed.error || "").toLowerCase() === "invalid_grant" || msg.toLowerCase().includes("invalid_grant")) {
                await markGoogleConnectionIncident({
                    pk,
                    sk,
                    status: "revoked",
                    errorCode: "refresh_invalid",
                    errorMessage: msg,
                });
                await errorSyncConfigsForGoogleIncident(userId, googleUserId, "Google account access was revoked — please reconnect your Google account").catch(() => {});
                console.error("Google token revoked (invalid_grant):", tokenRes.status, msg);
                throw new GoogleAuthRevokedError(msg);
            } else {
                await markGoogleConnectionIncident({
                    pk,
                    sk,
                    status: "error",
                    errorCode: "unknown",
                    errorMessage: msg,
                });
                await errorSyncConfigsForGoogleIncident(userId, googleUserId, "Google account authentication failed — please reconnect your Google account").catch(() => {});
                console.error("Google refresh_token exchange failed:", tokenRes.status, msg);
                throw new Error("Failed to refresh Google access token");
            }
        }

        const tokenJson = (await tokenRes.json()) as {
            access_token?: string;
            expires_in?: number;
            scope?: string;
            token_type?: string;
        };

        if (!tokenJson.access_token) {
            throw new Error("Google refresh response missing access_token");
        }

        accessToken = tokenJson.access_token;
        expiresAt = tokenJson.expires_in
            ? Date.now() + tokenJson.expires_in * 1000
            : undefined;

        const newAccessPayload: StoredAccessPayload = {
            accessToken,
            scope: tokenJson.scope ?? accessPayload.scope,
            tokenType: tokenJson.token_type ?? accessPayload.tokenType,
            expiresAt,
        };

        const newAccessTokenEncrypted = await tokenCipher.encrypt<StoredAccessPayload>(
            newAccessPayload,
            { purpose: "google_access_v1", aad },
        );

        // 3) Persist updated access token back to Dynamo
        await ddb.send(
            new UpdateCommand({
                TableName: TABLE_NAME,
                Key: {
                    pk,
                    sk,
                },
                UpdateExpression:
                    "SET accessTokenEncrypted = :accessTokenEncrypted, updatedAt = :now, lastValidatedAt = :now",
                ExpressionAttributeValues: {
                    ":accessTokenEncrypted": newAccessTokenEncrypted,
                    ":now": new Date().toISOString(),
                },
            }),
        );
    }

    return {
        accessToken,
        googleUserId: item.googleUserId,
        email: item.email,
        clientId,
        clientSecret,
    };
}
