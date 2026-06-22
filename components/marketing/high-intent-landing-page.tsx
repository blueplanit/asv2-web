import Link from "next/link";

type Cta = {
    href: string;
    label: string;
    external?: boolean;
};

type HeroDetail = {
    label: string;
    text: string;
};

type VisualRow = {
    title: string;
    body: string;
    pill: string;
};

type FeatureCard = {
    title: string;
    body: string;
};

type RelatedLink = {
    href: string;
    label: string;
};

type HighIntentLandingPageProps = {
    eyebrow: string;
    title: string;
    primaryCta: Cta;
    secondaryCta: Cta;
    heroDetails: HeroDetail[];
    visualTitle: string;
    visualSubtitle: string;
    visualRows: VisualRow[];
    summary: string;
    cards: FeatureCard[];
    relatedLinks: RelatedLink[];
};

function CtaLink({ cta, variant }: { cta: Cta; variant: "primary" | "secondary" }) {
    const className =
        variant === "primary"
            ? "inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            : "inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500";

    if (cta.external) {
        return (
            <a href={cta.href} target="_blank" rel="noreferrer" className={className}>
                {cta.label}
            </a>
        );
    }

    return (
        <Link href={cta.href} className={className}>
            {cta.label}
        </Link>
    );
}

export function HighIntentLandingPage({
    eyebrow,
    title,
    primaryCta,
    secondaryCta,
    heroDetails,
    visualTitle,
    visualSubtitle,
    visualRows,
    summary,
    cards,
    relatedLinks,
}: HighIntentLandingPageProps) {
    return (
        <main className="bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900">
            <section className="mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.82fr)] lg:items-center lg:gap-16 lg:py-20">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                        {eyebrow}
                    </div>

                    <h1 className="mt-8 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                        {title}
                    </h1>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <CtaLink cta={primaryCta} variant="primary" />
                        <CtaLink cta={secondaryCta} variant="secondary" />
                    </div>

                    <div className="mt-8 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                        {heroDetails.map((item) => (
                            <div key={item.label} className="flex items-start gap-2">
                                <span
                                    className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500"
                                    aria-hidden="true"
                                />
                                <span>
                                    <span className="font-semibold text-slate-800">{item.label}</span>{" "}
                                    {item.text}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_30px_100px_rgba(15,23,42,0.10)]">
                    <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-5">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                            <div>
                                <p className="text-sm font-semibold text-slate-950">{visualTitle}</p>
                                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                    {visualSubtitle}
                                </p>
                            </div>
                            <div className="flex gap-1.5" aria-hidden="true">
                                <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
                                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                            </div>
                        </div>

                        <div className="mt-4 space-y-3">
                            {visualRows.map((row) => (
                                <div
                                    key={row.title}
                                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h2 className="text-sm font-semibold text-slate-950">
                                                {row.title}
                                            </h2>
                                            <p className="mt-1 text-sm leading-relaxed text-slate-600">
                                                {row.body}
                                            </p>
                                        </div>
                                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                                            {row.pill}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-6 pb-16">
                <p className="max-w-4xl text-xl leading-relaxed text-slate-600">{summary}</p>

                <div className="mt-10 grid gap-4 md:grid-cols-3">
                    {cards.map((card) => (
                        <article
                            key={card.title}
                            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                        >
                            <h2 className="text-base font-semibold text-slate-950">{card.title}</h2>
                            <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.body}</p>
                        </article>
                    ))}
                </div>

                <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-semibold text-slate-950">Keep exploring SyncStaq</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm">
                        {relatedLinks.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-200 hover:text-slate-950"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}
