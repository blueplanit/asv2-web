// lib/google-auth.ts (server-only)
import "server-only";
import { ddb } from "./dynamo";
import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { GoogleConnectionSchema } from "@/lib/schemas/google-connection";
import {
    type StoredAccessPayload,
    type StoredRefreshPayload,
    createTokenCipher,
    parseKeyringJson,
    googleConnectionAad,
} from "@blueplanit/asv2-shared";
import { getGoogleClientConfigForShard } from "./google-oauth-sharding";
import { UserState } from "./user-state";
import { GOOGLE_DEFAULT_PROJECT_SHARD } from "./google-oauth-sharding";

const TABLE_NAME = process.env.DYNAMO_TABLE_NAME!;
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const TOKEN_CIPHER_KEYRING_JSON = process.env.ASV2_TOKEN_CIPHER_KEYRING_JSON!;
if (!TOKEN_CIPHER_KEYRING_JSON) {
  throw new Error("Missing ASV2_TOKEN_CIPHER_KEYRING_JSON");
}
const tokenCipher = createTokenCipher(parseKeyringJson(TOKEN_CIPHER_KEYRING_JSON));

// Assumes exactly one GoogleConnection per user for now
export async function getGoogleAccessTokenForUser(userState: UserState): Promise<{
    accessToken: string;
    googleUserId: string;
    email: string;
    clientId: string;
    clientSecret: string;
}> {
    const userId = userState.profile?.userId;
    if (!userId) {
        throw new Error("User ID not found");
    }

    const googleUserId = userState.profile?.googleUserId;
    const googleProjectShard = userState.googleConnections.find(connection => connection.googleUserId === googleUserId)?.googleProjectShard ?? GOOGLE_DEFAULT_PROJECT_SHARD;
    const { clientId, clientSecret } = getGoogleClientConfigForShard(googleProjectShard);

    // 1) Load GoogleConnection for this user
    const res = await ddb.send(
        new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
            ExpressionAttributeValues: {
                ":pk": `USER#${userId}`,
                ":sk": "GOOGLE#",
            },
            Limit: 1,
        }),
    );

    if (!res.Items || res.Items.length === 0) {
        throw new Error("No Google connection found for user");
    }

    const item = GoogleConnectionSchema.parse(res.Items[0]);

    const aad = googleConnectionAad(item);

    const accessPayload = await tokenCipher.decrypt<StoredAccessPayload>(
        item.accessTokenEncrypted,
        { purpose: "google_access_v1", aad },
    );
    const refreshPayload = await tokenCipher.decrypt<StoredRefreshPayload>(
        item.refreshTokenEncrypted,
        { purpose: "google_refresh_v1", aad },
    );

    let { accessToken, expiresAt } = accessPayload;
    const { refreshToken } = refreshPayload;

    const now = Date.now();
    const aboutToExpire =
        typeof expiresAt === "number" && expiresAt - now < 60_000; // 60s buffer

    if (!accessToken || aboutToExpire) {
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
            console.error(
                "Google refresh_token exchange failed:",
                tokenRes.status,
                await tokenRes.text(),
            );
            throw new Error("Failed to refresh Google access token");
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
                    pk: item.pk,
                    sk: item.sk,
                },
                UpdateExpression:
                    "SET accessTokenEncrypted = :accessTokenEncrypted, updatedAt = :updatedAt",
                ExpressionAttributeValues: {
                    ":accessTokenEncrypted": newAccessTokenEncrypted,
                    ":updatedAt": new Date().toISOString(),
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
