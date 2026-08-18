import React from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { PromotionBanner } from "@/components/layout/promotion-banner";
import { getActivePromotion } from "@/lib/promotions/get-active-promotion";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
    const promotion = await getActivePromotion();

    return (
        <div className="min-h-screen flex flex-col">
            {promotion && <PromotionBanner promotion={promotion} />}
            <SiteHeader variant="public" />
            <div className="flex-1">{children}</div>
        </div>
    );
}
