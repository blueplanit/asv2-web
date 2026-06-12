export const APP_NAME = "SyncStaq";
export const APP_UI_URL = process.env.APP_URL; // exists in env vars in vercel
export const APP_URL = process.env.NEXTAUTH_URL!;
export const IS_DEV = process.env.NODE_ENV === "development";