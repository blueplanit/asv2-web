// lib/google-connection.ts
import "server-only";
import { ddb } from "./dynamo";
import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import {
    GoogleConnectionSchema,
    type GoogleConnection,
} from "@/lib/schemas/google-connection";
import { googleConnectSk, userPk } from "@blueplanit/asv2-shared";

const TABLE_NAME = process.env.DYNAMO_TABLE_NAME!;

export async function putGoogleConnection(params: {
    pk: string;
    sk: string;
    userId: string;
    googleUserId: string;
    email: string;
    accessTokenEncrypted: string;
    refreshTokenEncrypted: string;
    googleProjectShard: string;
}) {
    const { pk, sk, userId, googleUserId, email, accessTokenEncrypted, refreshTokenEncrypted, googleProjectShard } = params;
    const now = new Date().toISOString();

    const item: GoogleConnection = GoogleConnectionSchema.parse({
        pk: pk,
        sk: sk,
        type: "GoogleConnection",
        userId: userId,
        googleUserId,
        email,
        status: "connected",
        accessTokenEncrypted,
        refreshTokenEncrypted,
        createdAt: now,
        updatedAt: now,
        googleProjectShard,
    });

    await ddb.send(
        new PutCommand({
            TableName: TABLE_NAME,
            Item: item,
        }),
    );

    return item;
}

export async function getGoogleConnection(userId: string, googleUserId: string) {
    const res = await ddb.send(
        new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                pk: userPk(userId),
                sk: googleConnectSk(googleUserId),
            },
        }),
    );
    if (!res.Item) return undefined;
    return GoogleConnectionSchema.parse(res.Item);
}
