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
            if (account && profile) {
              // Google subject (stable per Google account)
              token.googleUserId = (profile as any).sub;
            }
            return token;
          },
        async session({ session, token }) {
            // expose a stable authUserId to your app
            if (session.user && token.sub) {
                // @ts-expect-error augmenting session type
                session.user.id = token.sub;
                // @ts-expect-error custom field
                session.user.googleUserId = (token as any).googleUserId;
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
