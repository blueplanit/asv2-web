// app/(app)/dashboard/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { DashboardClient } from "@/components/dashboard/dashboard";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    return <DashboardClient />;
}
