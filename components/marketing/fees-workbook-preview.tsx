"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { FEES_VIEW_URL } from "@/lib/marketing/fees-and-refunds-template";

const views = [
    {
        id: "monthly",
        label: "Monthly report",
        file: "monthly-overview.jpg",
        alt: "Monthly table showing charge amounts, cumulative refunds, charge fees, and amounts after fees and refunds.",
    },
    {
        id: "charts",
        label: "Fee and refund charts",
        file: "charts.jpg",
        alt: "Charts comparing monthly charges with amounts after fees and refunds, and charge fees with cumulative refunds.",
    },
    {
        id: "refunds",
        label: "Refunded charges",
        file: "refunded-charges.jpg",
        alt: "Selected charge month and a detail table of refunded charges.",
    },
];

const assetPath = (file: string) => `/templates/fees-and-refunds/${file}`;

export function FeesWorkbookPreview() {
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
                    <strong>Fees and Refunds Report</strong>
                    <a href={FEES_VIEW_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-indigo-600">
                        Open the workbook
                    </a>
                </div>
                <div role="tablist" aria-label="Report views" className="grid grid-cols-3 border-b border-slate-200 min-[701px]:flex">
                    {views.map((item, index) => (
                        <button
                            key={item.id}
                            ref={(element) => { buttons.current[index] = element; }}
                            type="button"
                            id={`fees-tab-${item.id}`}
                            role="tab"
                            aria-controls={`fees-panel-${item.id}`}
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
                        id={`fees-panel-${item.id}`}
                        role="tabpanel"
                        aria-labelledby={`fees-tab-${item.id}`}
                        hidden={selected !== index}
                        tabIndex={0}
                        className="focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-indigo-600"
                    >
                        <div className={`overflow-auto ${item.id === "refunds" ? "h-[260px] min-[701px]:h-[280px]" : "h-[350px] min-[701px]:h-[430px]"}`}>
                            <Image
                                src={assetPath(item.file)}
                                width={1440}
                                height={716}
                                unoptimized
                                alt={item.alt}
                                className="-mt-[89px] block h-auto w-[920px] max-w-none min-[701px]:-mt-[116px] min-[701px]:w-[1200px]"
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
