import { AppShell } from "@/components/layout/app-shell";
import { loadUserState } from "@/lib/app-state/user-state";
import { UserStateProvider } from "@/components/user-state-provider";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).userId) {
        redirect("/login");
    }
    const userId = (session.user as any).userId as string;

    const userState = await loadUserState(userId);
    return (
        <UserStateProvider initialState={userState}>
            <AppShell>{children}</AppShell>
        </UserStateProvider>
    );
}
