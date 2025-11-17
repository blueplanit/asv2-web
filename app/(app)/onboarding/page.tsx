import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default async function OnboardingPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        // Not signed in → send to login
        redirect("/login");
    }

    // Optionally, you can pass session.user to the wizard later if needed
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 px-6 py-10">
            <OnboardingWizard />
        </div>
    );
}
