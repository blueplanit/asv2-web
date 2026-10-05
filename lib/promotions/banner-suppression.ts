// lib/promotions/banner-suppression.ts
// Shared by the marketing layout (server) and the banner (client), so the two sides
// cannot drift on the storage keys the pre-paint script reads.

export const DISMISSED_STORAGE_KEY = "promotion-banner-dismissed-id";
export const SUBSCRIBER_STORAGE_KEY = "promotion-banner-subscriber";
export const BANNER_ELEMENT_ID = "promotion-banner";
export const SUPPRESS_STYLE_ID = "promotion-banner-suppress";

// Hides the banner during parse, before it can paint. The page is static, so only the
// browser knows this visitor dismissed the Promotion or already pays for the app.
export function bannerSuppressionScript(promotionId: string) {
    return `try{var d=localStorage.getItem(${JSON.stringify(DISMISSED_STORAGE_KEY)})===${JSON.stringify(promotionId)};var s=localStorage.getItem(${JSON.stringify(SUBSCRIBER_STORAGE_KEY)})==="1";if(d||s){var e=document.createElement("style");e.id=${JSON.stringify(SUPPRESS_STYLE_ID)};e.textContent="#${BANNER_ELEMENT_ID}{display:none}";document.head.appendChild(e);}}catch(e){}`;
}
