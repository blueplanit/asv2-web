// app/(app)/onboarding/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { ensureUserProfile } from "@/lib/user-profile";
const isDev = process.env.NEXTAUTH_URL?.includes("localhost") ?? false;

export default async function OnboardingPage() {
    const session = await getServerSession(authOptions);

    if (isDev) console.log("session", session);

    if (!session?.user?.email || !(session.user as any).id) {
        redirect("/login"); // not authenticated
    }

    const authUserId = (session.user as any).id as string;
    const email = session.user.email;
    const googleUserId = (session.user as any).googleUserId;

    // Ensure user exists in DynamoDB
    await ensureUserProfile(authUserId, email, googleUserId);
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 px-6 py-10">
            <OnboardingWizard />
        </div>
    );
}
