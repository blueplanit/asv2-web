import { kitOptions } from "@/lib/stripeConnectOptions";

export const runtime = "nodejs";
export async function GET() {
    console.log("GET /api/stripe/connect");
    const state = await kitOptions.makeState();
    console.log("state", state);
    const params = new URLSearchParams({
        response_type: "code",
        client_id: kitOptions.clientId,
        scope: kitOptions.scope,
        redirect_uri: kitOptions.redirectUri,
        state,
    });
    console.log("params", params.toString());
    return Response.redirect(
        "https://connect.stripe.com/oauth/authorize?" + params.toString(),
        302
    );
}
