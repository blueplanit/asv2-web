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
        "subscriptionPlanId = :planId",
        "subscriptionInterval = :interval",
        "ACTIVE_SUB_GSI_PK = :aspk",
        "updatedAt = :now",
    ];
    const values: Record<string, unknown> = {
        ":status": "active",
        ":subId": subscriptionId,
        ":custId": stripeCustomerId,
        ":planId": planId,
        ":interval": interval,
        ":aspk": "ACTIVE#true",
        ":now": now,
    };

    if (periodEndIso) {
        updateParts.push("subscriptionCurrentPeriodEnd = :periodEnd");
        values[":periodEnd"] = periodEndIso;
    }

    if (rawStatus) {
        updateParts.push("subscriptionRawStatus = :raw");
        values[":raw"] = rawStatus;
    }

    await ddb.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk: "PROFILE" },
        UpdateExpression: `SET ${updateParts.join(", ")}`,
        ExpressionAttributeValues: values,
        ConditionExpression: "attribute_exists(pk) AND attribute_exists(sk)"
    }));
}

export async function updateUserSubscriptionStatusToInactive(
    authUserId: string,
) {
    const pk = `USER#${authUserId}`;
    const now = new Date().toISOString();

    await ddb.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk: "PROFILE" },
        UpdateExpression: `SET subscriptionStatus = :subscriptionStatus, updatedAt = :now REMOVE ACTIVE_SUB_GSI_PK`,
        ExpressionAttributeValues: {
            ":subscriptionStatus": "inactive",
            ":now": now,
        },
        ConditionExpression: "attribute_exists(pk) AND attribute_exists(sk)"
    }));
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
