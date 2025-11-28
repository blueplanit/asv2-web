// lib/user-profile.ts (server-only)
////////////////////////////////////////////////////////////////////////////
// 
// IMPORTANT!!!!!!!!!!
// DO NOT IMPORT THIS FILE IN CLIENT COMPONENTS. IT IS SERVER-ONLY.
//
////////////////////////////////////////////////////////////////////////////

import { ddb } from "./dynamo";
import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { UserProfileSchema, type UserProfile } from "./schemas/user-profile";
const TABLE_NAME = process.env.DYNAMO_TABLE_NAME!;

export type UpdateUserSubscriptionParams = {
    subscriptionId: string;
    stripeCustomerId: string;
    planId?: string;                 // e.g. "pro"
    interval?: "monthly" | "yearly"; // normalized
    currentPeriodEnd?: number | null; // unix seconds from Stripe
    rawStatus?: string;             // Stripe Subscription.status
};

export async function updateUserSubscriptionStatusToActive(
    authUserId: string,
    params: UpdateUserSubscriptionParams,
    expectedCurrentSubscriptionId?: string | null,
) {
    const pk = `USER#${authUserId}`;
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
    authUserId: string,
    rawStatus?: string, // e.g. Stripe subscription.status ("canceled", "unpaid", etc.)
    expectedSubscriptionId?: string,
) {
    const pk = `USER#${authUserId}`;
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


export async function getUserProfile(authUserId: string) {
    const pk = `USER#${authUserId}`;

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

export async function createUserProfile(
    authUserId: string,
    email: string,
    googleUserId: string
): Promise<UserProfile> {
    const now = new Date().toISOString();
    const pk = `USER#${authUserId}`;

    const item: UserProfile = {
        pk,
        sk: "PROFILE",
        userId: authUserId,
        email,
        googleUserId,
        createdAt: now,
        subscriptionStatus: "inactive",
        updatedAt: now,
    };

    // validate before write (optional if you're confident)
    UserProfileSchema.parse(item);

    await ddb.send(
        new PutCommand({
            TableName: TABLE_NAME,
            Item: item,
            ConditionExpression: "attribute_not_exists(pk)", // avoid overwrite
        })
    );

    return item;
}

export async function ensureUserProfile(authUserId: string, email: string, googleUserId: string) {
    const existing = await getUserProfile(authUserId);
    if (existing) return existing;
    try {
        return await createUserProfile(authUserId, email, googleUserId);
    } catch (err: any) {
        // If two requests race, a conditional failure is fine; just read again
        if (err.name === "ConditionalCheckFailedException") {
            return (await getUserProfile(authUserId))!;
        }
        throw err;
    }
}
