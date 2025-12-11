// lib/stripe-connection.ts
import { ddb } from "./dynamo";
import { PutCommand, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import {
    StripeConnectionSchema,
    type StripeConnection,
} from "@/lib/schemas/stripe-connection";

const TABLE_NAME = process.env.DYNAMO_TABLE_NAME!;

export async function putStripeConnection(params: {
    userId: string;
    stripeAccountId: string;
    businessName: string;
}) {
    const { userId, stripeAccountId, businessName } = params;
    const now = new Date().toISOString();

    const item: StripeConnection = StripeConnectionSchema.parse({
        pk: `USER#${userId}`,
        sk: `STRIPE#${stripeAccountId}`,
        type: "StripeConnection",
        userId: userId,
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

export async function getStripeConnection(userId: string, stripeAccountId: string) {
    const res = await ddb.send(
        new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                pk: `USER#${userId}`,
                sk: `STRIPE#${stripeAccountId}`,
            },
        }),
    );
    if (!res.Item) return undefined;
    return StripeConnectionSchema.parse(res.Item);
}


// Assumes exactly one StripeConnection per user for now    
export async function getStripeAccountIdForUser(
    userId: string,
): Promise<string | undefined> {
    const res = await ddb.send(
        new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
            ExpressionAttributeValues: {
                ":pk": `USER#${userId}`,
                ":sk": "STRIPE#",
            },
            Limit: 1,
        }),
    );

    if (!res.Items || res.Items.length === 0) return undefined;

    const conn = StripeConnectionSchema.parse(
        res.Items[0],
    ) as StripeConnection;
    return conn.stripeAccountId;
}