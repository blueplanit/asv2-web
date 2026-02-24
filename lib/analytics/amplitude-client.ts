"use client";

import amplitude from "amplitude-js";

const AMPLITUDE_API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
const EVENT_PREFIX = "SyncStaq: ";

let hasInitialized = false;

function getAmplitudeInstance() {
    return amplitude.getInstance();
}

export function initAmplitude() {
    if (!AMPLITUDE_API_KEY || hasInitialized) {
        return;
    }

    getAmplitudeInstance().init(AMPLITUDE_API_KEY, undefined, {
        saveEvents: true,
        includeUtm: true,
        includeReferrer: true,
    });

    hasInitialized = true;
}

export function identifyAmplitudeUser(params: {
    userId: string;
    email: string;
}) {
    if (!hasInitialized) {
        return;
    }

    const { userId, email } = params;
    const emailPrefix = email.split("@")[0] || email;
    const instance = getAmplitudeInstance();
    instance.setUserId(`${emailPrefix}-${userId}`);

    const identify = new amplitude.Identify();
    identify.set("email", email);
    instance.identify(identify);
}

export function resetAmplitudeUser() {
    if (!hasInitialized) {
        return;
    }

    const instance = getAmplitudeInstance();
    instance.setUserId(null);
    instance.regenerateDeviceId();
}

export function trackAmplitudeEvent(
    eventName: string,
    eventProperties?: Record<string, unknown>,
) {
    try {
        if (!hasInitialized) {
            return;
        }
        
        const normalizedEventName = eventName.startsWith(EVENT_PREFIX)
            ? eventName
            : `${EVENT_PREFIX}${eventName}`;

        getAmplitudeInstance().logEvent(normalizedEventName, eventProperties);
    } catch (error) {
        console.error("Error tracking amplitude event", error);
    }
}

export function trackAmplitudeError(
    eventName: string,
    error: unknown,
    eventProperties?: Record<string, unknown>,
) {
    const errorMessage =
        error instanceof Error
            ? error.message
            : typeof error === "string"
                ? error
                : JSON.stringify(error);

    trackAmplitudeEvent(eventName, {
        ...eventProperties,
        error_message: errorMessage,
    });
}
