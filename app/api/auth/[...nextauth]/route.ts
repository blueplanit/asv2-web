import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    // For now: cookie-based JWT sessions, no DB needed
    // (you can add an adapter later when DynamoDB is ready)
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login", // use our custom login page
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
