// app/api/billing/subscription-status/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserProfile } from "@/lib/dynamo/user-profile";
import { isUserProfileActivePaidSubscriber } from "@/lib/app-state/subscription-entitlement";

export const runtime = "nodejs";

// Lets a marketing page (session-agnostic, static — see ADR-0003) ask about the
// current visitor without giving up its own static rendering. Per-user, so never
// publicly cached.
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).userId) {
        return NextResponse.json({ activePaidSubscriber: false }, { status: 401 });
    }
    const userId = (session.user as any).userId as string;

    const profile = await getUserProfile(userId);
    const res = NextResponse.json({
        activePaidSubscriber: isUserProfileActivePaidSubscriber(profile),
    });
    res.headers.set("Cache-Control", "private, no-store");
    return res;
}
