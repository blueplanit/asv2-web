import { SUBSCRIPTION_DASHBOARD_VIEW_URL } from "@/lib/marketing/subscription-dashboard-template";

// Drawn in HTML until workbook screenshots exist; the other templates use images in public/templates/.
const tiles = [
    { label: "Active", value: "8", className: "bg-emerald-50 text-emerald-800" },
    { label: "Past due", value: "3", className: "bg-amber-50 text-amber-800" },
    { label: "Canceled", value: "3", className: "bg-slate-100 text-slate-700" },
    { label: "MRR", value: "1,017.00", className: "bg-indigo-50 text-indigo-800" },
];

const rows = [
    { status: "past_due", customer: "Cloud Ledger", product: "Pro Plan", amount: "59.00", interval: "month", started: "2026-05-08" },
    { status: "past_due", customer: "Nimbus Tools", product: "Team Plan", amount: "149.00", interval: "month", started: "2026-09-20" },
    { status: "active", customer: "Vector Finance", product: "Enterprise Plan", amount: "299.00", interval: "month", started: "2026-06-12" },
    { status: "active", customer: "Atlas Ops", product: "Team Plan", amount: "149.00", interval: "month", started: "2026-03-18" },
    { status: "active", customer: "Metric Labs", product: "Pro Plan", amount: "79.00", interval: "month", started: "2026-02-10" },
    { status: "canceled", customer: "Beacon Works", product: "Pro Plan", amount: "59.00", interval: "month", started: "2026-04-08" },
];

const statusClasses: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800",
    past_due: "bg-amber-100 text-amber-900",
    canceled: "bg-slate-200 text-slate-600",
};

export function SubscriptionDashboardPreview() {
    return (
        <figure>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white text-left">
                <div className="flex flex-col gap-1 border-b border-slate-200 px-5 py-4 min-[701px]:flex-row min-[701px]:items-center min-[701px]:justify-between">
                    <strong>Subscription Dashboard</strong>
                    <a href={SUBSCRIPTION_DASHBOARD_VIEW_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-indigo-600">
                        Open the workbook
                    </a>
                </div>
                <div className="p-5">
                    <div className="grid grid-cols-2 gap-3 min-[701px]:grid-cols-4">
                        {tiles.map((tile) => (
                            <div key={tile.label} className={`rounded-md px-4 py-3 ${tile.className}`}>
                                <p className="text-xs font-bold uppercase">{tile.label}</p>
                                <p className="mt-1 text-2xl font-semibold">{tile.value}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-5 overflow-x-auto">
                        <table className="w-full min-w-[720px] text-left text-sm">
                            <thead className="bg-slate-800 text-white">
                                <tr>
                                    {["Status", "Customer", "Product", "Amount", "Interval", "Started", "Stripe"].map((column) => (
                                        <th key={column} scope="col" className="px-3 py-2 font-semibold">{column}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {rows.map((row) => (
                                    <tr key={row.customer}>
                                        <td className="px-3 py-2">
                                            <span className={`rounded px-2 py-0.5 font-semibold ${statusClasses[row.status]}`}>{row.status}</span>
                                        </td>
                                        <td className="px-3 py-2 text-slate-950">{row.customer}</td>
                                        <td className="px-3 py-2">{row.product}</td>
                                        <td className="px-3 py-2">{row.amount}</td>
                                        <td className="px-3 py-2">{row.interval}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{row.started}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-indigo-600 underline underline-offset-4">Open in Stripe</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <figcaption className="mt-3 text-left text-sm text-slate-600">
                Preview shown with example Stripe data.
            </figcaption>
        </figure>
    );
}
