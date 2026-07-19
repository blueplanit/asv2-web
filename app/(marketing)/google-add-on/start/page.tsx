import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { LoginForm } from "@/components/login-form";
import { loadUserState } from "@/lib/app-state/user-state";
import {
    appendSearchParams,
    COMPANION_START_ALLOWED_PARAMS,
    nextPathForStage,
    pickAllowedSearchParams,
} from "@/lib/app-state/onboarding-redirect";

type SearchParamValue = string | string[] | undefined;
type SearchParams = Promise<Record<string, SearchParamValue>>;

export default async function GoogleAddOnStartPage(props: {
    searchParams: SearchParams;
}) {
    const session = await getServerSession(authOptions);
    const searchParams = await props.searchParams;
    const safeParams = pickAllowedSearchParams(
        searchParams,
        COMPANION_START_ALLOWED_PARAMS,
    );
    const callbackUrl = appendSearchParams("/google-add-on/start", safeParams);

    if (!session?.user || !(session.user as any).userId) {
        return (
            <LoginForm
                callbackUrl={callbackUrl}
                title="Welcome to SyncStaq"
                description="You’re in the right place to finish setting up SyncStaq. Continue with Google to connect Stripe and Google Drive, create your sheet, and start syncing Stripe data to Google Sheets."
                footerNote="You’ll finish setup on SyncStaq.com, and you can always reopen SyncStaq from the Google Sheets add-on when you need it."
            />
        );
    }

    const userId = (session.user as any).userId as string;
    const userState = await loadUserState(userId);

    redirect(appendSearchParams(nextPathForStage(userState.onboardingStage), safeParams));
}
