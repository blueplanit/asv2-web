// app/api/auth/[...nextauth]/route.ts

import "server-only";
import { ensureAppUserForGoogleLogin } from "@/lib/user-profile";
import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getGoogleClientConfigForShard } from "@/lib/google-oauth-sharding";


// Keep login on one shard unless truly need to shard login too.
const GOOGLE_AUTH_SHARD_SIGNUP = "gcp-0";
const { clientId, clientSecret } = getGoogleClientConfigForShard(GOOGLE_AUTH_SHARD_SIGNUP);

// Throttle DB ensure to avoid per-request Dynamo reads
const ENSURE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: clientId,
            clientSecret: clientSecret,
            authorization: {
                params: {
                    scope: [
                        "openid",
                        "https://www.googleapis.com/auth/userinfo.email",
                        "https://www.googleapis.com/auth/userinfo.profile",
                    ].join(" "),
                },
            },
        }),
    ],
    session: {
        strategy: "jwt",
    },
    jwt: { maxAge: 30 * 24 * 60 * 60 }, // 30 days
    callbacks: {
        async jwt({ token, account, profile }) {
            // Normalize googleUserId + email from either sign-in payload or existing token
            const isGoogleSignIn = account?.provider === "google" && profile;

            const googleUserId =
                (isGoogleSignIn ? (profile as any).sub : (token as any).googleUserId ?? token.sub) as
                | string
                | undefined;

            const email =
                (isGoogleSignIn ? (profile as any).email : (token as any).email ?? token.email) as
                | string
                | undefined;

            if (googleUserId) (token as any).googleUserId = googleUserId;
            if (email) (token as any).email = email;

            // Periodically re-ensure userId so DB wipes / migrations cannot strand stale JWTs
            const now = Date.now();
            const lastEnsuredAt = (token as any).userEnsuredAt as number | undefined;

            const shouldEnsure = isGoogleSignIn || !lastEnsuredAt || now - lastEnsuredAt > ENSURE_TTL_MS;

            // First time (on sign-in) we have account + profile
            if (shouldEnsure && googleUserId && email) {
                const { userId } = await ensureAppUserForGoogleLogin({
                    googleUserId,
                    email,
                });
                (token as any).userId = userId;
                (token as any).userEnsuredAt = now;
                return token;
            }
            return token;
        },
        async session({ session, token }) {
            // expose a stable userId to app
            if (session.user && token.sub) {
                // @ts-expect-error augmenting session type
                session.user.id = token.sub;
                (session.user as any).googleUserId = (token as any).googleUserId;
                (session.user as any).userId = (token as any).userId;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
