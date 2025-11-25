// app/(app)/billing/success/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { confirmCheckoutSessionAndActivateUser } from "@/lib/billing-confirm";

type SearchParams = {
    session_id?: string;
};

export default async function BillingSuccessPage(props: {
    searchParams: SearchParams;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
        redirect("/login");
    }
    const authUserId = (session.user as any).id as string;

    const { session_id } = await props.searchParams;
    const sessionId = session_id;

    if (sessionId) {
        try {
            await confirmCheckoutSessionAndActivateUser(sessionId, authUserId);
        } catch (err) {
            console.error("Error confirming checkout session:", err);
            // optional: render a soft error
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-4 text-center">
                <h1 className="text-2xl font-semibold text-slate-900">
                    Subscription activated
                </h1>
                <p className="text-sm text-slate-600">
                    Your subscription is now active. You can finish setting up your workspace and
                    start syncing data.
                </p>
                <a
                    href="/dashboard"
                    className="inline-flex cursor-pointer items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                    Go to dashboard
                </a>
            </div>
        </main>
    );
}
