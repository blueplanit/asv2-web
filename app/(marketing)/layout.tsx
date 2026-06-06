import React from "react";
import { SiteHeader } from "@/components/layout/site-header";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex flex-col">
            <SiteHeader variant="public" />
            <div className="flex-1">{children}</div>
        </div>
    );
}
