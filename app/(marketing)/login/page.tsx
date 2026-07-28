// app/login/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { LoginForm } from "@/components/login-form";
import { sanitizeCallbackUrl } from "@/lib/app-state/onboarding-redirect";

type SearchParams = Promise<{
    callbackUrl?: string | string[];
}>;

function firstValue(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage(props: {
    searchParams: SearchParams;
}) {
    const session = await getServerSession(authOptions);
    const searchParams = await props.searchParams;
    const callbackUrl = sanitizeCallbackUrl(firstValue(searchParams.callbackUrl));

    if (session) {
        redirect(callbackUrl);
    }

    return <LoginForm callbackUrl={callbackUrl} />;
}
