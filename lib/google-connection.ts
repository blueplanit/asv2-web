// lib/google-connection.ts
import { ddb } from "./dynamo";
import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import {
    GoogleConnectionSchema,
    type GoogleConnection,
} from "@/lib/schemas/google-connection";

const TABLE_NAME = process.env.DYNAMO_TABLE_NAME!;

export async function putGoogleConnection(params: {
    authUserId: string;
    googleUserId: string;
    email: string;
    accessTokenEncrypted: string;
    refreshTokenEncrypted: string;
}) {
    const { authUserId, googleUserId, email, accessTokenEncrypted, refreshTokenEncrypted } = params;
    const now = new Date().toISOString();

    const item: GoogleConnection = GoogleConnectionSchema.parse({
        pk: `USER#${authUserId}`,
        sk: `GOOGLE#${googleUserId}`,
        type: "GoogleConnection",
        userId: authUserId,
        googleUserId,
        email,
        status: "connected",
        accessTokenEncrypted,
        refreshTokenEncrypted,
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

export async function getGoogleConnection(authUserId: string, googleUserId: string) {
    const res = await ddb.send(
        new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                pk: `USER#${authUserId}`,
                sk: `GOOGLE#${googleUserId}`,
            },
        }),
    );
    if (!res.Item) return undefined;
    return GoogleConnectionSchema.parse(res.Item);
}
