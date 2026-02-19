// app/api/billing/portal/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { stripeBilling } from "@/lib/stripe/stripe-billing";
import { getUserProfile } from "@/lib/dynamo/user-profile";

export const runtime = "nodejs";

export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }
    const userId = (session.user as any).userId as string;

    const profile = await getUserProfile(userId);
    if (!profile?.subscriptionCustomerId) {
        return new NextResponse("No Stripe customer for this user", {
            status: 400,
        });
    }

    const portalSession = await stripeBilling.billingPortal.sessions.create({
        customer: profile.subscriptionCustomerId,
        return_url: `${process.env.NEXTAUTH_URL}/account`,
    });

    return NextResponse.json({ url: portalSession.url });
}
