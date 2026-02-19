// lib/recovery/recovery-preflight.ts
import { ddb } from "@/lib/dynamo";
import { QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { userPk, type GoogleConnection, type StripeConnection } from "@blueplanit/asv2-shared";

type RecoveryPreflightFailureCode =
    | "google_not_connected"
    | "google_revoked"
    | "google_error"
    | "google_missing_scope"
    | "google_file_forbidden"
    | "google_account_mismatch"
    | "stripe_not_connected"
    | "stripe_revoked"
    | "stripe_error";

type RecoveryPreflightResult =
    | { ok: true }
    | {
        ok: false;
        code: RecoveryPreflightFailureCode;
        message: string;
    };

const TABLE_NAME = process.env.DYNAMO_TABLE_NAME!;

export async function preflightRecovery(params: {
    userId: string;
    googleUserId: string;
    stripeAccountId: string;
}): Promise<RecoveryPreflightResult> {
    const { userId, googleUserId, stripeAccountId } = params;

    // 1) GoogleConnection: query by pk and sk prefix "GOOGLE#"
    const googleResp = await ddb.send(
        new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
            ExpressionAttributeValues: {
                ":pk": userPk(userId),
                ":skPrefix": "GOOGLE#",
            },
            Limit: 5,
        }),
    );

    const googleConnections = (googleResp.Items ?? []) as GoogleConnection[];
    const googleConn =
        googleConnections.find((c) => c.googleUserId === googleUserId) ??
        googleConnections[0];

    if (!googleConn) {
        return {
            ok: false,
            code: "google_not_connected",
            message:
                "Google Sheets is not connected for this workspace. Connect Google Sheets and try again.",
        };
    }

    if (googleConn.status === "revoked") {
        return {
            ok: false,
            code: "google_revoked",
            message:
                "Your Google Sheets connection was revoked. Reconnect Google Sheets to run recovery.",
        };
    }

    if (googleConn.status === "error") {
        switch (googleConn.errorCode) {
            case "scope_missing":
                return {
                    ok: false,
                    code: "google_missing_scope",
                    message:
                        "Your Google Sheets connection is missing required permissions. Reconnect Google Sheets and accept all requested scopes.",
                };
            case "file_forbidden":
                return {
                    ok: false,
                    code: "google_file_forbidden",
                    message:
                        "The app no longer has access to this sheet. Check sharing settings or choose a different sheet.",
                };
            case "account_mismatch":
                return {
                    ok: false,
                    code: "google_account_mismatch",
                    message:
                        "This workspace is linked to a different Google account. Connect with the correct account to continue.",
                };
            default:
                return {
                    ok: false,
                    code: "google_error",
                    message:
                        "Your Google Sheets connection is in an error state. Reconnect Google Sheets before running recovery.",
                };
        }
    }

    // 2) StripeConnection: direct Get by USER# + STRIPE#<accountId>
    const stripeResp = await ddb.send(
        new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                pk: userPk(userId),
                sk: `STRIPE#${stripeAccountId}`,
            },
        }),
    );

    const stripeConn = stripeResp.Item as StripeConnection | undefined;

    if (!stripeConn) {
        return {
            ok: false,
            code: "stripe_not_connected",
            message:
                "Stripe is not connected for this workspace. Connect your Stripe account and try again.",
        };
    }

    if (stripeConn.status === "revoked") {
        return {
            ok: false,
            code: "stripe_revoked",
            message:
                "Your Stripe connection was revoked. Reconnect Stripe to run recovery.",
        };
    }

    if (stripeConn.status === "error") {
        return {
            ok: false,
            code: "stripe_error",
            message:
                "Your Stripe connection is in an error state. Reconnect Stripe before running recovery.",
        };
    }

    return { ok: true };
}
