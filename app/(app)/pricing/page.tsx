// app/(marketing)/pricing/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PricingClient } from "@/components/pricing/pricing-client";

export default async function PricingPage() {
    const session = await getServerSession(authOptions);
    const isLoggedIn = !!session?.user;

    return <PricingClient isLoggedIn={isLoggedIn} />;
}
