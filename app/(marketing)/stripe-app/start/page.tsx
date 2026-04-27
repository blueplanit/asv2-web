import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { LoginForm } from "@/components/login-form";
import { loadUserState, type OnboardingStage } from "@/lib/app-state/user-state";

type SearchParamValue = string | string[] | undefined;
type SearchParams = Promise<Record<string, SearchParamValue>>;

function appendSearchParams(path: string, searchParams: Record<string, SearchParamValue>) {
    const [pathname, existingQuery = ""] = path.split("?");
    const nextSearchParams = new URLSearchParams(existingQuery);

    for (const [key, value] of Object.entries(searchParams)) {
        if (Array.isArray(value)) {
            for (const item of value) {
                nextSearchParams.append(key, item);
            }
            continue;
        }

        if (typeof value === "string") {
            nextSearchParams.set(key, value);
        }
    }

    const queryString = nextSearchParams.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
}

function nextPathForStage(stage: OnboardingStage) {
    switch (stage) {
        case "account_only":
        case "google_connected":
            return "/onboarding?step=1";
        case "stripe_connected":
            return "/onboarding?step=2";
        case "connections_linked":
            return "/onboarding?step=3";
        case "sheet_created":
            return "/onboarding?step=4";
        case "ready":
            return "/dashboard";
        default:
            return "/onboarding?step=1";
    }
}

export default async function StripeAppStartPage(props: {
    searchParams: SearchParams;
}) {
    const session = await getServerSession(authOptions);
    const searchParams = await props.searchParams;
    const callbackUrl = appendSearchParams("/stripe-app/start", searchParams);

    if (!session?.user || !(session.user as any).userId) {
        return (
            <LoginForm
                callbackUrl={callbackUrl}
                eyebrow="Stripe App"
                title="Finish setting up SyncStaq"
                description="SyncStaq is installed in Stripe. Continue on SyncStaq.com to sign up with Google, connect Stripe and Google Drive, create your sheet, and start syncing Stripe data to Google Sheets."
                footerNote="You’ll finish setup on SyncStaq.com, then you can reopen SyncStaq from Stripe anytime."
            />
        );
    }

    const userId = (session.user as any).userId as string;
    const userState = await loadUserState(userId);

    redirect(appendSearchParams(nextPathForStage(userState.onboardingStage), searchParams));
}
