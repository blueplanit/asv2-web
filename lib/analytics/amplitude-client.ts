"use client";

import amplitude from "amplitude-js";

const AMPLITUDE_API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
const AMPLITUDE_INSTANCE_NAME = "default";

let hasInitialized = false;

function getAmplitudeInstance() {
    return amplitude.getInstance(AMPLITUDE_INSTANCE_NAME);
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
    const instance = getAmplitudeInstance();
    instance.setUserId(`${email}-${userId}`);

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
    if (!hasInitialized) {
        return;
    }

    getAmplitudeInstance().logEvent(eventName, eventProperties);
}
