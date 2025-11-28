import { AppShell } from "@/components/layout/app-shell";
import { loadUserState } from "@/lib/user-state";
import { UserStateProvider } from "@/components/user-state-provider";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { AppProviders } from "@/components/providers/app-providers";
import { SiteHeader } from "@/components/layout/site-header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex flex-col">
            <SiteHeader variant="public" />
            <div className="flex-1">{children}</div>
        </div>
    );
}
