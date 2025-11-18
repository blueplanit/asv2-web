// lib/stripe-connection.ts
import { ddb } from "./dynamo";
import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import {
    StripeConnectionSchema,
    type StripeConnection,
} from "@/lib/schemas/stripe-connection";

const TABLE_NAME = process.env.DYNAMO_TABLE_NAME!;

export async function putStripeConnection(params: {
    authUserId: string;
    stripeAccountId: string;
    businessName: string;
}) {
    const { authUserId, stripeAccountId, businessName } = params;
    const now = new Date().toISOString();

    const item: StripeConnection = StripeConnectionSchema.parse({
        pk: `USER#${authUserId}`,
        sk: `STRIPE#${stripeAccountId}`,
        type: "StripeConnection",
        userId: authUserId,
        stripeAccountId,
        businessName,
        status: "connected",
        createdAt: now,
        updatedAt: now,
    });

    await ddb.send(
        new PutCommand({
            TableName: TABLE_NAME,
            Item: item,
        }),
    );

    return item;
}

export async function getStripeConnection(authUserId: string, stripeAccountId: string) {
    const res = await ddb.send(
        new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                pk: `USER#${authUserId}`,
                sk: `STRIPE#${stripeAccountId}`,
            },
        }),
    );
    if (!res.Item) return undefined;
    return StripeConnectionSchema.parse(res.Item);
}
