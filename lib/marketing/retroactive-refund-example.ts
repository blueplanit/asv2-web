export const refundExample = {
    chargeMonth: "May 2026",
    amountCents: 4900,
    feeCents: 172,
    originalRefundCents: 2000,
    laterRefundCents: 2500,
    annualRefundCents: 11400,
    annualAfterFeesCents: 88918,
} as const;

export function getRefundExampleState(step: number) {
    const stripeRefundCents = step > 0 ? refundExample.laterRefundCents : refundExample.originalRefundCents;
    const sheetRefundCents = step >= 2 ? stripeRefundCents : refundExample.originalRefundCents;
    const changeCents = sheetRefundCents - refundExample.originalRefundCents;
    return {
        stripeRefundCents,
        sheetRefundCents,
        reportAfterFeesCents: refundExample.amountCents - sheetRefundCents - refundExample.feeCents,
        annualRefundCents: refundExample.annualRefundCents + changeCents,
        annualAfterFeesCents: refundExample.annualAfterFeesCents - changeCents,
    };
}

export const refundExampleSteps = [
    { label: "Before the later refund", detail: "The May charge has $20 refunded. The report shows $27.28 after fees and refunds." },
    { label: "A later refund in Stripe", detail: "An additional $5 refund takes the charge to $25 refunded. The Sheet still shows the previous values." },
    { label: "Next hourly sync and recalculation", detail: "The existing row updates to $25 refunded. Formulas restate May to $22.28. Charge amount and fee are unchanged." },
] as const;
