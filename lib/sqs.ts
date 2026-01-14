// lib/sqs.ts
import { SQSClient } from "@aws-sdk/client-sqs";

const region = process.env.AWS_REGION!;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID!;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY!;

// Single SQS client instance reused across the app
const sqsClient = new SQSClient({
    region,
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
});

/**
 * Direct export if you prefer `import { sqs } from "@/lib/sqs"`.
 */
export const sqs = sqsClient;

/**
 * Getter used in API routes etc: `const sqs = getSqsClient();`
 */
export function getSqsClient(): SQSClient {
    return sqsClient;
}
