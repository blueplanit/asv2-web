// lib/user-profile.ts (server-only)
////////////////////////////////////////////////////////////////////////////
// 
// IMPORTANT!!!!!!!!!!
// DO NOT IMPORT THIS FILE IN CLIENT COMPONENTS. IT IS SERVER-ONLY.
//
////////////////////////////////////////////////////////////////////////////

import { ddb } from "./dynamo";
import { GetCommand, PutCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { UserProfileSchema, type UserProfile } from "./schemas/user-profile";
import { ulid } from "ulid";
const TABLE_NAME = process.env.DYNAMO_TABLE_NAME!;
const GOOGLE_ID_GSI_NAME = "GOOGLE_GSI"; // must match CDK definition

export type UpdateUserSubscriptionParams = {
    subscriptionId: string;
    stripeCustomerId: string;
    planId?: string;                 // e.g. "pro"
    interval?: "monthly" | "yearly"; // normalized
    currentPeriodEnd?: number | null; // unix seconds from Stripe
    rawStatus?: string;             // Stripe Subscription.status
};

export async function updateUserSubscriptionStatusToActive(
    userId: string,
    params: UpdateUserSubscriptionParams,
    expectedCurrentSubscriptionId?: string | null,
) {
    const pk = `USER#${userId}`;
    const now = new Date().toISOString();

    const {
        subscriptionId,
        stripeCustomerId,
        planId,
        interval,
        currentPeriodEnd,
        rawStatus
    } = params;

    const periodEndIso =
        typeof currentPeriodEnd === "number"
            ? new Date(currentPeriodEnd * 1000).toISOString()
            : undefined;

    const updateParts: string[] = [
        "subscriptionStatus = :status",
        "subscriptionId = :subId",
        "subscriptionCustomerId = :custId",
        "ACTIVE_SUB_GSI_PK = :aspk",
        "updatedAt = :now",
    ];
    const values: Record<string, unknown> = {
        ":status": "active",
        ":subId": subscriptionId,
        ":custId": stripeCustomerId,
        ":aspk": "ACTIVE#true",
        ":now": now,
    };

    if (planId) {
        updateParts.push("subscriptionPlanId = :planId");
        values[":planId"] = planId;
    }
    if (interval) {
        updateParts.push("subscriptionInterval = :interval");
        values[":interval"] = interval;
    }

    if (periodEndIso) {
        updateParts.push("subscriptionCurrentPeriodEnd = :periodEnd");
        values[":periodEnd"] = periodEndIso;
    }

    if (rawStatus) {
        updateParts.push("subscriptionRawStatus = :raw");
        values[":raw"] = rawStatus;
    }

    // Base condition: item must exist
    let conditionExpr = "attribute_exists(pk) AND attribute_exists(sk)";

    // Optional concurrency guard on previous/current subscriptionId (prevent race conditions where out of order updates happen)
    if (expectedCurrentSubscriptionId !== undefined) {
        if (expectedCurrentSubscriptionId === null) {
            // Expect that there is no subscriptionId yet
            conditionExpr += " AND attribute_not_exists(subscriptionId)";
        } else {
            // Expect subscriptionId is still the previous one, or unset
            conditionExpr +=
                " AND (attribute_not_exists(subscriptionId) OR subscriptionId = :expectedSubId)";
            values[":expectedSubId"] = expectedCurrentSubscriptionId;
        }
    }

    await ddb.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk: "PROFILE" },
        UpdateExpression: `SET ${updateParts.join(", ")}`,
        ExpressionAttributeValues: values,
        ConditionExpression: conditionExpr,
    }));
}

export async function updateUserSubscriptionStatusToInactive(
    userId: string,
    rawStatus?: string, // e.g. Stripe subscription.status ("canceled", "unpaid", etc.)
    expectedSubscriptionId?: string,
) {
    const pk = `USER#${userId}`;
    const now = new Date().toISOString();

    let updateExpr =
        "SET subscriptionStatus = :subscriptionStatus, updatedAt = :now";
    const values: Record<string, unknown> = {
        ":subscriptionStatus": "inactive",
        ":now": now,
    };

    if (rawStatus) {
        updateExpr += ", subscriptionRawStatus = :rawStatus";
        values[":rawStatus"] = rawStatus;
    }

    updateExpr += " REMOVE ACTIVE_SUB_GSI_PK";

    // Base condition: item must exist
    // Optional concurrency guard on previous/current subscriptionId (prevent race conditions where out of order updates happen)
    let conditionExpr = "attribute_exists(pk) AND attribute_exists(sk)";
    if (expectedSubscriptionId) {
        conditionExpr += " AND subscriptionId = :expectedSubId";
        values[":expectedSubId"] = expectedSubscriptionId;
    }

    await ddb.send(
        new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { pk, sk: "PROFILE" },
            UpdateExpression: updateExpr,
            ExpressionAttributeValues: values,
            ConditionExpression: conditionExpr,
        }),
    );
}


export async function getUserProfile(userId: string) {
    const pk = `USER#${userId}`;

    const res = await ddb.send(
        new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk, sk: "PROFILE" },
        })
    );
    if (!res.Item) return undefined;

    const parsed = UserProfileSchema.parse(res.Item);
    return parsed; // typed UserProfile
}

export async function getUserProfileByGoogleUserId(
    googleUserId: string,
): Promise<UserProfile | undefined> {
    // 1) Query GSI to find the base-table key
    const res = await ddb.send(
        new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: GOOGLE_ID_GSI_NAME,
            KeyConditionExpression: "GOOGLE_GSI_PK = :gpk",
            ExpressionAttributeValues: {
                ":gpk": `GOOGLE#${googleUserId}`,
            },
            Limit: 1,
        }),
    );

    const indexItem = res.Items?.[0];
    if (!indexItem) return undefined;

    const { pk, sk } = indexItem;

    // 2) Fetch full item from base table
    const getRes = await ddb.send(
        new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk, sk },
        }),
    );

    if (!getRes.Item) return undefined;
    return UserProfileSchema.parse(getRes.Item);
}

async function createUserProfileForGoogleLogin(params: {
    googleUserId: string;
    email: string;
}): Promise<UserProfile> {
    const { googleUserId, email } = params;
    const now = new Date().toISOString();
    const userId = ulid();
    if (!googleUserId) {
        throw new Error("Google user ID is required");
    }

    const item: UserProfile = {
        pk: `USER#${userId}`,
        sk: "PROFILE",
        userId: userId,
        email,
        googleUserId,
        createdAt: now,
        updatedAt: now,
        subscriptionStatus: "inactive",
        // optionally set GOOGLE_GSI_PK, etc.
        GOOGLE_GSI_PK: `GOOGLE#${googleUserId}`,
    } as any;

    UserProfileSchema.parse(item);

    await ddb.send(
        new PutCommand({
            TableName: TABLE_NAME,
            Item: item,
            ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        }),
    );

    return item;
}

// Main entry point from auth callback
export async function ensureAppUserForGoogleLogin(params: {
    googleUserId: string;
    email: string;
}): Promise<{ userId: string }> {
    const existing = await getUserProfileByGoogleUserId(params.googleUserId);
    if (existing) {
        return { userId: existing.userId };
    }

    const created = await createUserProfileForGoogleLogin(params);
    return { userId: created.userId };
}