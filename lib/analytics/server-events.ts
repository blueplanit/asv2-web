import "server-only";
import { isDevEnvironment } from "@/lib/utils";

// Server-side counterpart to lib/analytics/amplitude-client.ts. Exists because
// the events that matter most for the funnel — account creation and the first
// successful payment — happen with no browser attached.
const AMPLITUDE_HTTP_V2_ENDPOINT = "https://api2.amplitude.com/2/httpapi";
const AMPLITUDE_API_KEY = process.env.AMPLITUDE_API_KEY;
const EVENT_PREFIX = "SyncStaq: ";

// Callers await this inside login and webhook handlers, so a slow or hanging
// Amplitude must not hold them open. Failing to record an event is always
// preferable to stalling the request that triggered it.
const REQUEST_TIMEOUT_MS = 3000;

export type ServerEventParams = {
    // Bare userId, matching what the browser SDK sets, so both land on the
    // same Amplitude user.
    userId: string;
    eventName: string;
    eventProperties?: Record<string, unknown>;
    userProperties?: Record<string, unknown>;
    // Stripe retries webhooks on any non-2xx, and Amplitude deduplicates
    // repeated insert_ids for 7 days.
    insertId?: string;
    // Amplitude's reserved revenue fields. Sending price + quantity lets it
    // compute revenue itself.
    price?: number;
    quantity?: number;
    productId?: string;
    // Epoch millis. Capture this when the thing being measured actually
    // happened, not when the event is sent — that decouples funnel ordering
    // from call ordering, so emitting can be deferred off a critical path.
    // Defaults to send time.
    time?: number;
};

function toAmplitudeEvent(params: ServerEventParams) {
    const {
        userId,
        eventName,
        eventProperties,
        userProperties,
        insertId,
        price,
        quantity,
        productId,
        time,
    } = params;

    const eventType = eventName.startsWith(EVENT_PREFIX)
        ? eventName
        : `${EVENT_PREFIX}${eventName}`;

    return {
        user_id: userId,
        event_type: eventType,
        time: time ?? Date.now(),
        ...(insertId ? { insert_id: insertId } : {}),
        ...(eventProperties ? { event_properties: eventProperties } : {}),
        ...(userProperties ? { user_properties: userProperties } : {}),
        ...(price != null ? { price } : {}),
        ...(quantity != null ? { quantity } : {}),
        ...(productId ? { productId } : {}),
    };
}

/**
 * Sends a batch in one request. Never throws and never hangs. Callers sit on
 * primary paths — the NextAuth callback, the Stripe webhook, the Google OAuth
 * callback — where an analytics failure must not surface as a broken login, a
 * retried webhook, or an error page after a spreadsheet was created.
 *
 * One event per request, deliberately. Amplitude rejects an entire payload if
 * any single event in it is invalid, so batching would couple two independent
 * events' failure. Callers that emit several should run inside `after()`, where
 * the extra round trip costs the user nothing.
 */
export async function trackServerEvent(params: ServerEventParams): Promise<void> {
    try {
        if (!AMPLITUDE_API_KEY || isDevEnvironment()) {
            return;
        }

        const response = await fetch(AMPLITUDE_HTTP_V2_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            body: JSON.stringify({
                api_key: AMPLITUDE_API_KEY,
                events: [toAmplitudeEvent(params)],
            }),
        });

        if (!response.ok) {
            const body = await response.text().catch(() => "");
            console.error(
                `Amplitude server event failed: ${params.eventName}, status: ${response.status}, body: ${body}`,
            );
        }
    } catch (error) {
        // Swallowed deliberately, including AbortError from the timeout above.
        console.error(
            `Amplitude server event threw: ${params.eventName}`,
            error,
        );
    }
}
