// app/pricing/page.tsx
import { PricingClient } from "@/components/pricing/pricing-client";
import { getPricingCopy } from "@/lib/pricing/pricing-config";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const revalidate = 60;

export default async function PricingPage() {
    const session = await getServerSession(authOptions);
    const isLoggedIn = !!session?.user;

    const pricingCopy = await getPricingCopy();

    return <PricingClient isLoggedIn={isLoggedIn} copy={pricingCopy} />;
}
