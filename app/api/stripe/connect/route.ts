// app/api/stripe/connect/route.ts
import "server-only";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { makeState } from "@/lib/oauthState";

export const runtime = "nodejs";
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).userId) {
        return new Response("Unauthorized", { status: 401 });
    }
    const userId = (session.user as any).userId as string;
    const state = await makeState(userId);
    const params = new URLSearchParams({
        response_type: "code",
        client_id: process.env.STRIPE_CLIENT_ID!,
        scope: "read_only",
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/stripe/callback`,
        state,
    });
    return Response.redirect(
        "https://connect.stripe.com/oauth/authorize?" + params.toString(),
        302
    );
}
