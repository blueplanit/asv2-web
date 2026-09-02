// app/(app)/billing/success/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { confirmCheckoutSessionAndActivateUser } from "@/lib/billing/billing-confirm";
import { ActivationPendingRetry } from "@/components/billing/activation-pending-retry";

type SearchParams = {
    session_id?: string;
};

export default async function BillingSuccessPage(props: {
    searchParams: SearchParams;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).userId) {
        redirect("/login");
    }
    const userId = (session.user as any).userId as string;

    const { session_id } = await props.searchParams;
    const sessionId = session_id;
    let activationState: "active" | "pending" | "invalid" = sessionId
        ? "pending"
        : "invalid";

    if (sessionId) {
        try {
            const activated = await confirmCheckoutSessionAndActivateUser(sessionId, userId);
            activationState = activated ? "active" : "pending";
        } catch (err) {
            console.error("Subscription activation is pending:", err);
        }
    }

    const isActive = activationState === "active";
    const isInvalid = activationState === "invalid";
    const title = isActive
        ? "Subscription activated"
        : isInvalid
            ? "We couldn't verify this checkout"
            : "We're confirming your checkout";
    const description = isActive
        ? "Your subscription is now active. Cancel anytime from your account page."
        : isInvalid
            ? "Return to pricing and start checkout again when you're ready."
            : "This usually takes only a moment. Please don't start another checkout.";
    const href = isActive ? "/dashboard" : "/pricing";
    const linkLabel = isActive ? "Go to dashboard" : "Return to pricing";

    return (
        <main className="min-h-[75vh] flex items-center justify-center bg-slate-50 px-4">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-4 text-center">
                <h1 className="text-2xl font-semibold text-slate-900">
                    {title}
                </h1>
                <p className="text-sm text-slate-600">
                    {description}
                </p>
                {activationState === "pending" ? (
                    <ActivationPendingRetry />
                ) : (
                    <a
                        href={href}
                        className="inline-flex cursor-pointer items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                    >
                        {linkLabel}
                    </a>
                )}
            </div>
        </main>
    );
}
