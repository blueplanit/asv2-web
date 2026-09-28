"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";

const views = [
    {
        id: "summary",
        label: "Payout Summary",
        file: "payout-summary.jpg",
        width: 560,
        height: 265,
        alt: "Actual Payout Summary tab: commissions by partner and rep, with a monthly filter and totals.",
        description:
            "Review commission totals by owner for all periods or a selected month. The sample workbook shows $155.43 in total commissions.",
    },
    {
        id: "owners",
        label: "Owners & Rates",
        file: "owners-rates.jpg",
        width: 800,
        height: 240,
        alt: "Actual Owners & Rates tab with partner and rep percentage rates.",
        description:
            "Enter your owners and their rates. The current calculation uses one lookup rate per owner; effective dates and refund-policy labels are not applied automatically.",
    },
    {
        id: "settings",
        label: "Settings",
        file: "settings.jpg",
        width: 900,
        height: 300,
        alt: "Actual Settings tab with refund deduction and gross or net commission base inputs.",
        description:
            "Choose whether to subtract refunds, and select Gross or Net as the commission base. Reports use the charge-created month.",
    },
];

export function CommissionWorkbookPreview() {
    const [selected, setSelected] = useState(0);
    const buttons = useRef<(HTMLButtonElement | null)[]>([]);

    function handleKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
        let next: number;
        switch (event.key) {
            case "ArrowRight":
                next = (index + 1) % views.length;
                break;
            case "ArrowLeft":
                next = (index + views.length - 1) % views.length;
                break;
            case "Home":
                next = 0;
                break;
            case "End":
                next = views.length - 1;
                break;
            default:
                return;
        }
        event.preventDefault();
        setSelected(next);
        buttons.current[next]?.focus();
    }

    return (
        <figure>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="flex flex-col justify-between gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
                    <strong>
                        Stripe Commission &amp; Revenue-Share Tracker
                    </strong>
                    <span className="text-sm text-slate-600">
                        Google Sheets · Example data
                    </span>
                </div>
                <div
                    role="tablist"
                    aria-label="Workbook previews"
                    className="flex overflow-x-auto border-b border-slate-200"
                >
                    {views.map((item, index) => (
                        <button
                            key={item.id}
                            ref={(element) => {
                                buttons.current[index] = element;
                            }}
                            type="button"
                            id={`workbook-tab-${item.id}`}
                            role="tab"
                            aria-selected={selected === index}
                            aria-controls={`workbook-panel-${item.id}`}
                            tabIndex={selected === index ? 0 : -1}
                            onClick={() => setSelected(index)}
                            onKeyDown={(event) => handleKey(event, index)}
                            className={`shrink-0 border-b-2 px-5 py-4 text-sm focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-indigo-600 ${selected === index ? "border-indigo-600 font-semibold text-indigo-600" : "border-transparent text-slate-600 hover:bg-slate-50"}`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
                {views.map((item, index) => (
                    <div
                        key={item.id}
                        id={`workbook-panel-${item.id}`}
                        role="tabpanel"
                        aria-labelledby={`workbook-tab-${item.id}`}
                        hidden={selected !== index}
                        tabIndex={0}
                        className="focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-indigo-600"
                    >
                        <div className="flex min-h-[180px] items-start justify-center px-3 py-6 sm:min-h-[340px] sm:px-5 sm:py-8">
                            <Image
                                src={`/templates/commission-tracker/${item.file}`}
                                width={item.width}
                                height={item.height}
                                alt={item.alt}
                                className="h-auto max-w-full object-contain"
                                unoptimized
                            />
                        </div>
                        <p className="px-5 pb-5 text-sm leading-6 text-slate-600">
                            {item.description}
                        </p>
                    </div>
                ))}
            </div>
            <figcaption className="mt-3 text-xs leading-5 text-slate-600">
                Screenshots from the template. Example figures are not a promise
                of earnings or a payment instruction.
            </figcaption>
        </figure>
    );
}
