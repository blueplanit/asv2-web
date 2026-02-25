"use client";

import { useState } from "react";
import { RequestColumnModal } from "./request-column-modal";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

type Props = {
    workspaceName?: string | null;
    stripeAccountId?: string | null;
};

export function RequestColumnButton(props: Props) {
    const [open, setOpen] = useState(false);

    return (
        <div className="flex items-center justify-end">
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="inline-flex items-center justify-center rounded-full border border-indigo-600 bg-transparent px-2 py-0.5 text-[11px] font-medium leading-tight text-indigo-600 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                        aria-label="Request a new column"
                    >
                        <span className="text-[11px] leading-none mr-0.5">
                            +
                        </span>
                        Request data
                    </button>
                </TooltipTrigger>
                <TooltipContent>
                    Need more data for your reports? Request them here.
                </TooltipContent>
            </Tooltip>
            <RequestColumnModal
                open={open}
                onClose={() => setOpen(false)}
                workspaceName={props.workspaceName ?? undefined}
                stripeAccountId={props.stripeAccountId ?? undefined}
            />
        </div>
    );
}
