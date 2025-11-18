// lib/user-profile.ts (server-only)
////////////////////////////////////////////////////////////////////////////
// 
// IMPORTANT!!!!!!!!!!
// DO NOT IMPORT THIS FILE IN CLIENT COMPONENTS. IT IS SERVER-ONLY.
//
////////////////////////////////////////////////////////////////////////////

import { ddb } from "./dynamo";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.DYNAMO_TABLE_NAME!;

export type UserProfile = {
    pk: string;   // USER#<authUserId>
    sk: string;   // PROFILE
    userId: string;
    email: string;
    googleUserId: string;
    createdAt: string;
};

export async function getUserProfile(authUserId: string) {
    const pk = `USER#${authUserId}`;

    const res = await ddb.send(
        new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk, sk: "PROFILE" },
        })
    );

    return res.Item as UserProfile | undefined;
}

export async function createUserProfile(authUserId: string, email: string, googleUserId: string) {
    const now = new Date().toISOString();
    const pk = `USER#${authUserId}`;

    const item: UserProfile = {
        pk,
        sk: "PROFILE",
        userId: authUserId,
        email,
        googleUserId,
        createdAt: now,
    };

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
