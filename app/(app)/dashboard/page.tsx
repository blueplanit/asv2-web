// app/(app)/dashboard/page.tsx
import { DashboardClient } from "@/components/dashboard/dashboard";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { loadUserState } from "@/lib/user-state";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
        redirect("/login");
    }

    const authUserId = (session.user as any).id as string;
    const userState = await loadUserState(authUserId);

    // If they’re already done, send them straight to dashboard
    if (userState.onboardingStage === "account_only") {
        redirect("/onboarding");
    }
    return <DashboardClient />;
}
