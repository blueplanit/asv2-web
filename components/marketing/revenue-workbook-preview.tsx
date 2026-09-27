"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { REVENUE_VIEW_URL } from "@/lib/marketing/revenue-by-product-template";

const views = [
    {
        id: "monthly",
        label: "Monthly product table",
        file: "monthly-product-table.jpg",
        height: 621,
        alt: "Revenue by Product workbook with one revenue column for each product and a total for each month.",
    },
    {
        id: "trend",
        label: "Revenue chart",
        file: "revenue-chart.jpg",
        height: 470,
        alt: "Stacked monthly column chart showing billed revenue contributions by product.",
    },
    {
        id: "product",
        label: "Monthly breakdown",
        file: "monthly-breakdown.jpg",
        height: 545,
        alt: "Selected-month product breakdown with a local month input, revenue amounts and share by product.",
    },
];
const assetPath = (file: string) => `/templates/revenue-by-product/${file}`;

export function RevenueWorkbookPreview() {
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
                    <strong>Revenue by Product</strong>
                    <a href={REVENUE_VIEW_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-indigo-600">
                        Open the workbook
                    </a>
                </div>
                <div role="tablist" aria-label="Report views" className="grid grid-cols-3 border-b border-slate-200 min-[701px]:flex">
                    {views.map((item, index) => (
                        <button
                            key={item.id}
                            ref={(element) => { buttons.current[index] = element; }}
                            type="button"
                            id={`revenue-tab-${item.id}`}
                            role="tab"
                            aria-controls={`revenue-panel-${item.id}`}
                            aria-selected={selected === index}
                            tabIndex={selected === index ? 0 : -1}
                            onClick={() => setSelected(index)}
                            onKeyDown={(event) => handleKey(event, index)}
                            className={`min-h-16 cursor-pointer border-b-[3px] px-2 py-3 text-sm leading-snug focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-indigo-600 min-[701px]:min-h-14 min-[701px]:px-5 min-[701px]:text-base ${selected === index ? "border-indigo-600 font-semibold text-indigo-600" : "border-transparent text-slate-600 hover:bg-slate-50"}`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
                {views.map((item, index) => (
                    <div
                        key={item.id}
                        id={`revenue-panel-${item.id}`}
                        role="tabpanel"
                        aria-labelledby={`revenue-tab-${item.id}`}
                        hidden={selected !== index}
                        tabIndex={0}
                        className="focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-indigo-600"
                    >
                        <div className={item.id === "monthly"
                            ? "h-[330px] overflow-auto min-[701px]:h-auto min-[701px]:aspect-[1380/621] min-[701px]:overflow-hidden"
                            : "flex aspect-[1380/621] items-center justify-center overflow-hidden"}>
                            <Image
                                src={assetPath(item.file)}
                                width={1380}
                                height={item.height}
                                unoptimized
                                alt={item.alt}
                                className={item.id === "monthly"
                                    ? "block h-auto w-full min-w-[720px] min-[701px]:h-full min-[701px]:min-w-0 min-[701px]:object-contain"
                                    : "block h-full w-full object-contain"}
                            />
                        </div>
                    </div>
                ))}
            </div>
            <figcaption className="mt-3 flex flex-col gap-1.5 text-sm text-slate-600 min-[701px]:flex-row min-[701px]:justify-between">
                <span>Preview shown with example data.</span>
                <a href={assetPath(view.file)} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-indigo-600">
                    Enlarge preview
                </a>
            </figcaption>
        </figure>
    );
}
