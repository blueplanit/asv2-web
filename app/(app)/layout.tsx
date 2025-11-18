import { AppShell } from "@/components/layout/app-shell";
import { loadUserState } from "@/lib/user-state";
import { UserStateProvider } from "@/components/user-state-provider";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
        redirect("/login");
    }
    const authUserId = (session.user as any).id as string;

    const userState = await loadUserState(authUserId);
    return (
        <UserStateProvider initialState={userState}>
            <AppShell>{children}</AppShell>
        </UserStateProvider>
    );
}
