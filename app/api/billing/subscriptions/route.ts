import "server-only";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { stripeBilling } from "@/lib/stripe-billing";
import { getUserProfile } from "@/lib/user-profile";

export const runtime = "nodejs";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }
    const userId = (session.user as any).userId as string;

    const profile = await getUserProfile(userId);
    const customerId = profile?.subscriptionCustomerId;

    console.log("customerId", customerId);

    if (!customerId) {
        return NextResponse.json({ subscriptions: [] });
    }

    const list = await stripeBilling.subscriptions.list({
        limit: 2,
        expand: ["data.customer"],
    });

    console.log("list ------", JSON.stringify(list, null, 2));

    return NextResponse.json({ subscriptions: list.data });
}
