// lib/stripe-connection.ts
import { ddb } from "./dynamo";
import { PutCommand, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
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


// Assumes exactly one StripeConnection per user for now    
export async function getStripeAccountIdForUser(
    authUserId: string,
): Promise<string | undefined> {
    const res = await ddb.send(
        new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
            ExpressionAttributeValues: {
                ":pk": `USER#${authUserId}`,
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