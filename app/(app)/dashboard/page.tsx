"use client";

import { WorkspaceCard, type Workspace } from "@/components/workspaces/workspace-card";

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

export default function DashboardPage() {
    function handleSyncNow(id: string) {
        // TODO: POST /api/workspaces/{id}/sync
        console.log("Sync now for workspace", id);
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

            <section className="grid gap-4 md:grid-cols-2">
                {MOCK_WORKSPACES.map((ws) => (
                    <WorkspaceCard key={ws.id} workspace={ws} onSyncNow={handleSyncNow} />
                ))}
            </section>
        </div>
    );
}
