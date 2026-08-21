import { NextResponse } from "next/server";
import { getBillingDisplay } from "@/lib/pricing/get-billing-display";

export async function GET() {
    const { billingDisplay, promotionId } = await getBillingDisplay();

    const res = NextResponse.json({ billingDisplay, promotionId });
    res.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res;
}
