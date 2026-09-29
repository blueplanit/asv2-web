"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { CUSTOMER_REVENUE_VIEW_URL } from "@/lib/marketing/customer-revenue-template";

const views = [
    {
        id: "ranking",
        label: "Customer ranking",
        file: "customer-ranking.jpg",
        width: 1040,
        height: 390,
        alt: "Customer ranking table and bar chart showing billed revenue by customer.",
    },
    {
        id: "monthly",
        label: "Monthly customer report",
        file: "monthly-customer.jpg",
        width: 815,
        height: 608,
        alt: "Selected customer, year, monthly billed revenue table and chart, and invoice list.",
    },
];

const assetPath = (file: string) => `/templates/customer-revenue/${file}`;

export function CustomerRevenueWorkbookPreview() {
    const [selected, setSelected] = useState(0);
    const buttons = useRef<(HTMLButtonElement | null)[]>([]);
    const view = views[selected];

    function handleKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
        let next: number;
        switch (event.key) {
            case "ArrowRight": next = (index + 1) % views.length; break;
            case "ArrowLeft": next = (index + views.length - 1) % views.length; break;
            case "Home": next = 0; break;
            case "End": next = views.length - 1; break;
            default: return;
        }
        event.preventDefault();
        setSelected(next);
        buttons.current[next]?.focus();
    }

    return (
        <figure>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="flex flex-col gap-1 border-b border-slate-200 px-5 py-4 min-[701px]:flex-row min-[701px]:items-center min-[701px]:justify-between">
                    <strong>Customer Revenue Report</strong>
                    <a href={CUSTOMER_REVENUE_VIEW_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-indigo-600">
                        Open the workbook
                    </a>
                </div>
                <div role="tablist" aria-label="Report views" className="grid grid-cols-2 border-b border-slate-200 min-[701px]:flex">
                    {views.map((item, index) => (
                        <button
                            key={item.id}
                            ref={(element) => { buttons.current[index] = element; }}
                            type="button"
                            id={`customer-revenue-tab-${item.id}`}
                            role="tab"
                            aria-controls={`customer-revenue-panel-${item.id}`}
                            aria-selected={selected === index}
                            tabIndex={selected === index ? 0 : -1}
                            onClick={() => setSelected(index)}
                            onKeyDown={(event) => handleKey(event, index)}
                            className={`min-h-14 cursor-pointer border-b-[3px] px-2 py-3 text-sm leading-snug focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-indigo-600 min-[701px]:px-5 min-[701px]:text-base ${selected === index ? "border-indigo-600 font-semibold text-indigo-600" : "border-transparent text-slate-600 hover:bg-slate-50"}`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
                {views.map((item, index) => (
                    <div
                        key={item.id}
                        id={`customer-revenue-panel-${item.id}`}
                        role="tabpanel"
                        aria-labelledby={`customer-revenue-tab-${item.id}`}
                        hidden={selected !== index}
                        tabIndex={0}
                        className="focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-indigo-600"
                    >
                        <div className="h-[350px] overflow-auto min-[701px]:h-auto">
                            <Image
                                src={assetPath(item.file)}
                                width={item.width}
                                height={item.height}
                                unoptimized
                                alt={item.alt}
                                className="block h-auto max-w-none min-[701px]:mx-auto min-[701px]:max-w-full"
                            />
                        </div>
                    </div>
                ))}
            </div>
            <figcaption className="mt-3 flex flex-col gap-1.5 text-sm text-slate-600 min-[701px]:flex-row min-[701px]:justify-between">
                <span>Preview shown with example Stripe data.</span>
                <a href={assetPath(view.file)} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-indigo-600">
                    Enlarge preview
                </a>
            </figcaption>
        </figure>
    );
}
