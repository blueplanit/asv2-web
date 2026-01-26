'use client';

import { useState } from 'react';

// Minimal Stripe Subscription shape returned from subscriptions.list
type StripeSubscription = {
	id: string;
	status: string;
	created: number;
	current_period_end?: number;
	cancel_at_period_end?: boolean;
	items?: {
		data?: Array<{
			price?: { id?: string; unit_amount?: number; currency?: string };
		}>;
	};
};

export default function TestPage() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [subscriptions, setSubscriptions] = useState<StripeSubscription[]>(
		[],
	);

	async function fetchSubscriptionList() {
		setError(null);
		setLoading(true);
		try {
			const res = await fetch('/api/billing/subscriptions', {
				method: 'GET',
			});
			const data = await res.json();

			if (!res.ok) {
				setError(data?.message || data?.error || `HTTP ${res.status}`);
				setSubscriptions([]);
				return;
			}
			setSubscriptions(data.subscriptions ?? []);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Request failed');
			setSubscriptions([]);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="mx-auto max-w-2xl space-y-6 p-6">
			<h1 className="text-xl font-semibold text-slate-900">
				subscriptions.list
			</h1>
			<p className="text-sm text-slate-600">
				Fetches{' '}
				<code className="rounded bg-slate-100 px-1">
					stripe.subscriptions.list
				</code>{' '}
				(filtered by your Stripe customer) via GET
				/api/billing/subscriptions.
			</p>

			<button
				type="button"
				onClick={fetchSubscriptionList}
				disabled={loading}
				className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
			>
				{loading ? 'Loading…' : 'Fetch subscriptions.list'}
			</button>

			{error && (
				<div
					role="alert"
					className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
				>
					{error}
				</div>
			)}

			{subscriptions.length > 0 && (
				<section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
					<h2 className="bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 border-b border-slate-200">
						Subscriptions ({subscriptions.length})
					</h2>
					<ul className="divide-y divide-slate-100">
						{subscriptions.map((sub) => (
							<pre
								key={sub.id}
								className="overflow-x-auto p-4 text-xs text-slate-700 font-mono whitespace-pre"
							>
								{JSON.stringify(sub, null, 2)}
							</pre>
						))}
					</ul>
				</section>
			)}

			{!loading && subscriptions.length === 0 && (
				<p className="text-sm text-slate-500">
					Click the button to load <code>subscriptions.list</code>. If
					you have no Stripe customer or subscriptions, the list will
					be empty.
				</p>
			)}
		</div>
	);
}
