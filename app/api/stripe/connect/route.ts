import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { makeState } from "@/lib/oauthState";

export const runtime = "nodejs";
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
        return new Response("Unauthorized", { status: 401 });
    }
    const authUserId = (session.user as any).id as string;
    console.log("GET /api/stripe/connect");
    const state = await makeState(authUserId);
    console.log("state", state);
    const params = new URLSearchParams({
        response_type: "code",
        client_id: process.env.STRIPE_CLIENT_ID!,
        scope: "read_only",
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/stripe/callback`,
        state,
    });
    console.log("params", params.toString());
    return Response.redirect(
        "https://connect.stripe.com/oauth/authorize?" + params.toString(),
        302
    );
}
