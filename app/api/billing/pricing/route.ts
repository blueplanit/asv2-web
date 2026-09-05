import { NextResponse } from "next/server";
import { getBillingDisplay } from "@/lib/pricing/get-billing-display";

export async function GET() {
    const { billingDisplay, promotionId, promotionVersion } = await getBillingDisplay();

    const res = NextResponse.json({ billingDisplay, promotionId, promotionVersion });
    // Never cached: a CDN hit skips this handler, so a changed Promotion would keep
    // serving a price checkout no longer charges. The price reads cache inside instead.
    res.headers.set("Cache-Control", "private, no-store");
    return res;
}
