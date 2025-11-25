// app/api/billing/setup-checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { stripeBilling } from "@/lib/stripe-billing";
import { getUserProfile } from "@/lib/user-profile";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }
    const authUserId = (session.user as any).id as string;

    const profile = await getUserProfile(authUserId);
    if (!profile) {
        return new NextResponse("User profile not found", { status: 400 });
    }

    if (!profile.subscriptionId || !profile.subscriptionCustomerId) {
        return new NextResponse("No active trial subscription found", { status: 400 });
    }

    // Keep it simple: only allow this while trialing/active
    if (profile.subscriptionStatus !== "active") {
        return new NextResponse("Subscription not in a billable state", { status: 400 });
    }

    const successUrl = `${process.env.NEXTAUTH_URL}/billing/success?setup_session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.NEXTAUTH_URL}/billing?setup_canceled=1`;

    const checkoutSession = await stripeBilling.checkout.sessions.create({
        mode: "setup",
        customer: profile.subscriptionCustomerId,
        payment_method_types: ["card"],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
            authUserId,
            subscriptionId: profile.subscriptionId,
        },
    });

    return NextResponse.json({ url: checkoutSession.url });
}
