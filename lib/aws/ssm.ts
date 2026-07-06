// lib/aws/ssm.ts
import "server-only";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

const ssm = new SSMClient({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

const cache = new Map<string, string>();

export async function getSsmParameter(
    name: string,
    options?: { decrypt?: boolean },
): Promise<string> {
    const decrypt = options?.decrypt ?? false;
    const cacheKey = `${name}:${decrypt ? "1" : "0"}`;
    const cached = cache.get(cacheKey);
    if (cached !== undefined) {
        return cached;
    }

    const res = await ssm.send(
        new GetParameterCommand({
            Name: name,
            WithDecryption: decrypt,
        }),
    );

    const value = res.Parameter?.Value;
    if (!value) {
        throw new Error(`SSM parameter missing value: ${name}`);
    }

    cache.set(cacheKey, value);
    return value;
}
