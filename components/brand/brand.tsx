import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";
import { APP_NAME } from "@/lib/constants";

type Props = {
    href?: string;
    size?: number; // px
    showText?: boolean;
    showTagline?: boolean;
    className?: string;
};

export function Brand({
    href = "/",
    size = 32,
    showText = true,
    showTagline = true,
    className,
}: Props) {
    return (
        <Link href={href} className={clsx("flex items-center gap-3", className)}>
            <Image
                src="/brand/syncstaq-icon.svg"
                alt={`${APP_NAME} logo`}
                width={size}
                height={size}
                priority
            />
            {showText ? (
                <div className="flex flex-col">
                    <span className="text-sm font-semibold tracking-tight text-slate-900">
                        {APP_NAME}
                    </span>
                    {showTagline ? (
                        <span className="text-xs text-slate-500">Stripe → Google Sheets</span>
                    ) : null}
                </div>
            ) : null}
        </Link>
    );
}
