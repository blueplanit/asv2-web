export const APP_NAME = "SyncStaq";
export const SITE_URL = "https://www.syncstaq.com";
export const APP_URL = process.env.NEXTAUTH_URL ?? SITE_URL;
export const STRIPE_MARKETPLACE_URL = "https://marketplace.stripe.com/apps/syncstaq";
export const IS_DEV = process.env.NODE_ENV === "development";
