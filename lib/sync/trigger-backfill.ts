import "server-only";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const lambda = new LambdaClient({ region: process.env.AWS_REGION });

const START_BACKFILL_FUNCTION_NAME = process.env.START_BACKFILL_FUNCTION_NAME;
if (!START_BACKFILL_FUNCTION_NAME) {
    throw new Error("Missing env var START_BACKFILL_FUNCTION_NAME");
}

// Fire the backfill Lambda (async) for a sheet whose config is backfill_running.
// The Lambda fills history, creates the sync cursors, then flips it to syncing.
export async function triggerInitialBackfill(
    userId: string,
    spreadsheetId: string,
): Promise<void> {
    const payload = { userId, spreadsheetId };
    await lambda.send(
        new InvokeCommand({
            FunctionName: START_BACKFILL_FUNCTION_NAME,
            InvocationType: "Event",
            Payload: new TextEncoder().encode(JSON.stringify(payload)),
        }),
    );
}
