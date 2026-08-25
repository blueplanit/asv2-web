import React from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { PromotionBanner } from "@/components/layout/promotion-banner";
import { getActivePromotion } from "@/lib/promotions/get-active-promotion";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
    const promotion = await getActivePromotion();

    return (
        <div className="min-h-screen flex flex-col">
            {/* key forces a fresh instance per Promotion, so a prior Promotion's
                dismissal/impression state can never leak into a new one. */}
            {promotion && <PromotionBanner key={promotion.id} promotion={promotion} />}
            <SiteHeader variant="public" />
            <div className="flex-1">{children}</div>
        </div>
    );
}
