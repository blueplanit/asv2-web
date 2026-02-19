// lib/dynamo/ensure-stripe-customer.ts
////////////////////////////////////////////////////////////////////////////
// SERVER-ONLY
////////////////////////////////////////////////////////////////////////////

import { ddb } from "@/lib/dynamo";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { stripeBilling } from "@/lib/stripe/stripe-billing";
import { getUserProfile } from "@/lib/dynamo/user-profile";

const TABLE_NAME = process.env.DYNAMO_TABLE_NAME!;

export async function ensureStripeCustomerId(userId: string): Promise<string> {
    const profile = await getUserProfile(userId);
    if (!profile) throw new Error("User profile not found");

    if (profile.subscriptionCustomerId) {
        return profile.subscriptionCustomerId;
    }

    const customer = await stripeBilling.customers.create({
        email: profile.email,
        metadata: {
            userId,
        },
    });

    const now = new Date().toISOString();

    await ddb.send(
        new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { pk: profile.pk, sk: "PROFILE" },
            UpdateExpression:
                "SET subscriptionCustomerId = :custId, updatedAt = :now",
            ExpressionAttributeValues: {
                ":custId": customer.id,
                ":now": now,
            },
            ConditionExpression: "attribute_exists(pk) AND attribute_exists(sk)",
        }),
    );

    return customer.id;
}
