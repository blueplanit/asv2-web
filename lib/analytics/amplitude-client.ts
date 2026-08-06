"use client";

import * as amplitude from "@amplitude/analytics-browser";
import { isDevEnvironment } from "@/lib/utils";

const AMPLITUDE_API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
const EVENT_PREFIX = "SyncStaq: ";

// Acquisition surfaces a user can arrive through. Derived from the landing
// route, not a query param, so nothing has to survive the OAuth round-trip.
export type AcquisitionChannel = "web" | "stripe_app" | "google_add_on";

let hasInitialized = false;

// Local dev shares the production project key, so events would otherwise
// pollute the funnel with fake signups and conversions.
function isTrackingDisabled() {
    return !AMPLITUDE_API_KEY || isDevEnvironment();
}

// Analytics must never break the feature it is measuring. Every exported
// function routes through this, so a bad SDK call degrades to a console error
// instead of taking down a sign-in button or an onboarding step.
function safely(operation: string, fn: () => void) {
    try {
        fn();
    } catch (error) {
        console.error(`Amplitude ${operation} failed`, error);
    }
}

export function initAmplitude() {
    if (isTrackingDisabled() || hasInitialized) {
        return;
    }

    safely("init", () => {
        amplitude.init(AMPLITUDE_API_KEY!, {
            autocapture: {
                // Covers every marketing route without a per-page tracker.
                pageViews: true,
                // utm_*, referrer and click ids, captured at session start.
                attribution: true,
                sessions: true,
                formInteractions: false,
                fileDownloads: false,
                elementInteractions: false,
            },
        });

        // Only inside the guard: if init threw, nothing else should proceed.
        hasInitialized = true;
    });
}

export function identifyAmplitudeUser(params: {
    userId: string;
    email: string;
}) {
    if (!hasInitialized) {
        return;
    }

    // Bare userId, so server-side events from the Stripe webhook land on the
    // same Amplitude user. Amplitude cannot merge two different user ids.
    const { userId, email } = params;

    safely("identify", () => {
        amplitude.setUserId(userId);

        const identify = new amplitude.Identify();
        identify.set("email", email);
        amplitude.identify(identify);
    });
}

export function resetAmplitudeUser() {
    if (!hasInitialized) {
        return;
    }

    safely("reset", () => amplitude.reset());
}

// First touch wins: a user who arrives organically and later opens the Stripe
// app stays attributed to "web".
export function stampAcquisitionChannel(channel: AcquisitionChannel) {
    if (!hasInitialized) {
        return;
    }

    safely("acquisition channel stamp", () => {
        const identify = new amplitude.Identify();
        identify.setOnce("acquisition_channel", channel);
        amplitude.identify(identify);
    });
}

export function trackAmplitudeEvent(
    eventName: string,
    eventProperties?: Record<string, unknown>,
    // insertId lets a client emit deduplicate against a server emit of the same
    // event — pass the same value from both sides.
    options?: { insertId?: string },
) {
    if (!hasInitialized) {
        return;
    }

    safely(`track ${eventName}`, () => {
        const normalizedEventName = eventName.startsWith(EVENT_PREFIX)
            ? eventName
            : `${EVENT_PREFIX}${eventName}`;

        amplitude.track(
            normalizedEventName,
            eventProperties,
            options?.insertId ? { insert_id: options.insertId } : undefined,
        );
    });
}

export function trackAmplitudeError(
    eventName: string,
    error: unknown,
    eventProperties?: Record<string, unknown>,
) {
    // JSON.stringify throws on circular references, so it cannot sit outside a
    // guard — an unserializable error object would otherwise take out the
    // caller's own error-handling path.
    let errorMessage = "Unserializable error";
    safely("error serialization", () => {
        errorMessage =
            error instanceof Error
                ? error.message
                : typeof error === "string"
                    ? error
                    : JSON.stringify(error);
    });

    trackAmplitudeEvent(eventName, {
        ...eventProperties,
        error_message: errorMessage,
    });
}
