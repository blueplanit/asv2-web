// app/(app)/onboarding/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { loadUserState } from "@/lib/app-state/user-state";
import { hasCompletedOnboarding } from "@/lib/app-state/onboarding-status";
const isDev = process.env.NEXTAUTH_URL?.includes("localhost") ?? false;

export default async function OnboardingPage() {
    const session = await getServerSession(authOptions);

    if (isDev) console.log("session", session);

    if (!session?.user?.email || !(session.user as any).userId) {
        redirect("/login"); // not authenticated
    }

    // Already onboarded → wizard is off-limits, no matter how they got here.
    const userId = (session.user as any).userId as string;
    const userState = await loadUserState(userId);
    if (hasCompletedOnboarding(userState.syncConfigs)) {
        redirect("/dashboard");
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 px-6 py-10">
            <OnboardingWizard />
        </div>
    );
}
