import { NextResponse } from "next/server";
import { getBillingDisplay } from "@/lib/pricing/get-billing-display";

export async function GET() {
    const { billingDisplay, promotionId } = await getBillingDisplay();

    const res = NextResponse.json({ billingDisplay, promotionId });
    // Never cached: a CDN hit skips this handler entirely, so a Promotion that started
    // or ended would keep serving a price checkout no longer charges. The Stripe price
    // reads this header used to protect are cached inside getBillingDisplay instead.
    res.headers.set("Cache-Control", "private, no-store");
    return res;
}
