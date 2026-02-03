import { NextResponse } from "next/server";
import { getBillingDisplay } from "@/lib/pricing/get-billing-display";

export async function GET() {
    const billingDisplay = await getBillingDisplay();

    const res = NextResponse.json({ billingDisplay });
    res.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res;
}
