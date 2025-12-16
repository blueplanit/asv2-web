import "server-only";
import { ensureAppUserForGoogleLogin } from "@/lib/user-profile";
import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
    callbacks: {
        async jwt({ token, account, profile }) {
            // First time (on sign-in) we have account + profile
            if (account?.provider === "google" && profile) {
                const googleUserId = (profile as any).sub as string;
                const email = (profile as any).email as string;

                (token as any).googleUserId = googleUserId;

                const { userId } = await ensureAppUserForGoogleLogin({
                    googleUserId,
                    email,
                });
                (token as any).userId = userId;
                return token;
            }
            if (!(token as any).userId) {
                const googleUserId = (token as any).googleUserId as string | undefined;
                const email = (token as any).email as string | undefined;

                if (googleUserId && email) {
                    const { userId } = await ensureAppUserForGoogleLogin({ googleUserId, email });
                    (token as any).userId = userId;
                }
            }
            return token;
        },
        async session({ session, token }) {
            // expose a stable userId to app
            if (session.user && token.sub) {
                // @ts-expect-error augmenting session type
                session.user.id = token.sub;
                // @ts-expect-error custom field
                session.user.googleUserId = (token as any).googleUserId;

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
