"use client";

import { useState } from "react";
import { RequestColumnModal } from "./request-column-modal";

type Props = {
  userEmail?: string | null;
  workspaceName?: string | null;
  stripeAccountId?: string | null;
};

export function RequestColumnButton(props: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center justify-end">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-full border border-indigo-600 bg-transparent px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        aria-label="Request a new Stripe column"
      >
        <span className="text-xs leading-none mr-1">+</span>
        Request column
      </button>

      <RequestColumnModal
        open={open}
        onClose={() => setOpen(false)}
        userEmail={props.userEmail ?? undefined}
        workspaceName={props.workspaceName ?? undefined}
        stripeAccountId={props.stripeAccountId ?? undefined}
      />
    </div>
  );
}
