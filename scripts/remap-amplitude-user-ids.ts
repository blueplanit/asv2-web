/**
 * One-time migration: map each user's legacy Amplitude identity onto the bare
 * userId that the app now sends from both the browser and the server.
 *
 * The browser SDK used to set `${emailPrefix}-${userId}` as the Amplitude
 * user_id. Amplitude cannot merge two user ids on its own — "if you create a
 * new user ID for an existing user, Amplitude recognizes them as different
 * unique users" — so existing users would otherwise show up as brand new.
 *
 * Usage (dry run prints the mappings and changes nothing):
 *   npx tsx scripts/remap-amplitude-user-ids.ts
 *   npx tsx scripts/remap-amplitude-user-ids.ts --apply
 *
 * Requires DYNAMO_TABLE_NAME, AWS credentials, and AMPLITUDE_API_KEY.
 * Reversible: re-POST the same user_id with { unmap: true }.
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.DYNAMO_TABLE_NAME;
const AMPLITUDE_API_KEY = process.env.AMPLITUDE_API_KEY;
const USERMAP_ENDPOINT = "https://api.amplitude.com/usermap";

// Amplitude allows ~1500 alias calls per 30s window; batches cap at 2000.
const BATCH_SIZE = 100;
const BATCH_PAUSE_MS = 3000;

type Mapping = { user_id: string; global_user_id: string };

// Mirrors the old identifyAmplitudeUser() in lib/analytics/amplitude-client.ts.
function legacyAmplitudeUserId(email: string, userId: string) {
    const emailPrefix = email.split("@")[0] || email;
    return `${emailPrefix}-${userId}`;
}

async function collectMappings(): Promise<Mapping[]> {
    const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
    const mappings: Mapping[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined;

    do {
        const res = await ddb.send(
            new ScanCommand({
                TableName: TABLE_NAME,
                FilterExpression: "sk = :sk",
                ExpressionAttributeValues: { ":sk": "PROFILE" },
                ExclusiveStartKey: lastEvaluatedKey as any,
            }),
        );

        for (const item of res.Items ?? []) {
            const userId = item.userId as string | undefined;
            const email = item.email as string | undefined;
            if (!userId || !email) continue;

            const legacyId = legacyAmplitudeUserId(email, userId);
            // A user whose email prefix is already the userId needs no mapping.
            if (legacyId === userId) continue;

            mappings.push({ user_id: legacyId, global_user_id: userId });
        }

        lastEvaluatedKey = res.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return mappings;
}

async function sendBatch(batch: Mapping[]) {
    const body = new URLSearchParams({
        api_key: AMPLITUDE_API_KEY!,
        mapping: JSON.stringify(batch),
    });

    const res = await fetch(USERMAP_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });

    if (!res.ok) {
        throw new Error(
            `usermap failed: ${res.status} ${await res.text().catch(() => "")}`,
        );
    }
}

async function main() {
    const apply = process.argv.includes("--apply");

    if (!TABLE_NAME) throw new Error("DYNAMO_TABLE_NAME is not set");
    if (apply && !AMPLITUDE_API_KEY) {
        throw new Error("AMPLITUDE_API_KEY is not set");
    }

    const mappings = await collectMappings();
    console.log(`Found ${mappings.length} user(s) to remap.`);

    if (!apply) {
        for (const m of mappings.slice(0, 20)) {
            console.log(`  ${m.user_id}  ->  ${m.global_user_id}`);
        }
        if (mappings.length > 20) {
            console.log(`  ... and ${mappings.length - 20} more`);
        }
        console.log("\nDry run. Re-run with --apply to send these to Amplitude.");
        return;
    }

    for (let i = 0; i < mappings.length; i += BATCH_SIZE) {
        const batch = mappings.slice(i, i + BATCH_SIZE);
        await sendBatch(batch);
        console.log(`Remapped ${Math.min(i + BATCH_SIZE, mappings.length)}/${mappings.length}`);

        if (i + BATCH_SIZE < mappings.length) {
            await new Promise((resolve) => setTimeout(resolve, BATCH_PAUSE_MS));
        }
    }

    console.log("Done.");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
