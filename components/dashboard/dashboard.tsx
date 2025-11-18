// app/(app)/dashboard/dashboard-client.tsx
"use client";

import { WorkspaceCard, type Workspace } from "@/components/workspaces/workspace-card";
import { useUserState } from "../user-state-provider";
import { SyncConfig } from "@/lib/schemas/sync-config";
import Link from "next/link";

const MOCK_WORKSPACES: Workspace[] = [
    {
        id: "ws_123",
        name: "Main Workspace",
        stripeAccountName: "Acme Inc.",
        sheetName: "Stripe Sync – Acme Inc.",
        sheetUrl: "https://docs.google.com/spreadsheets/d/example",
        lastSyncAt: "Just now",
        health: "healthy",
        objectsEnabled: ["Invoices", "Charges", "Customers", "Payouts"],
    },
];

export function DashboardClient() {
    const userState = useUserState();
    const { user, setUser } = userState;
    const { onboardingStage, googleConnections, syncConfigs } = user;
    console.log("userState", user);

    function handleSyncNow(id: string) {
        // TODO: POST /api/workspaces/{id}/sync
        console.log("Sync now for workspace", id);
    }

    // Assume there is only one sync config for a user for MVP 
    const userSyncConfig: SyncConfig | null = syncConfigs.length > 0 ? syncConfigs[0] : null;
    let tempElement = null;
    let tempLink = '/onboarding';
    if (onboardingStage === "account_only") {
        tempElement = <div>Step 1: Connect Stripe to get started.</div>;
        tempLink = '/onboarding?step=1';
    }
    else if (onboardingStage === "stripe_connected" && googleConnections.length === 0) {
        tempElement = <div>Step 2: Connect Google Sheets.</div>;
        tempLink = '/onboarding?step=2';
    }
    else if (onboardingStage === "connections_linked" && syncConfigs.length === 0 || 
        onboardingStage === "google_connected" && syncConfigs.length === 0
    ) {
        tempElement = <div>Step 3: Create your workspace sheet.</div>;
        tempLink = '/onboarding?step=3';
    }
    else if (onboardingStage === "connections_linked" && syncConfigs.length > 0) {
        if (userSyncConfig?.enabledStripeObjects.length === 0) {
            tempElement = <div>Step 4: Choose objects to sync.</div>;
            tempLink = '/onboarding?step=4';
        }
    }
    const onboardLink = tempElement ? <Link href={tempLink}><span className="text-indigo-600 underline-offset-2 hover:underline ml-2">Continue onboarding.</span></Link> : null;
    if (!tempElement) {
        tempElement = <div>Onboarding complete.</div>;
    }


    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Control tower</p>
                    <h1 className="text-2xl font-semibold text-slate-900">Your workspaces</h1>
                    <p className="mt-1 text-sm text-slate-600">
                        Each workspace mirrors one Stripe account into a dedicated Google Sheet.
                    </p>
                </div>
            </header>

            <div className="flex items-center">
                {tempElement} {onboardLink}
            </div>

            <section className="grid gap-4 md:grid-cols-2">
                {MOCK_WORKSPACES.map((ws) => (
                    <WorkspaceCard key={ws.id} workspace={ws} onSyncNow={handleSyncNow} />
                ))}
            </section>
        </div>
    );
}
