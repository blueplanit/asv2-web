// app/login/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
    const session = await getServerSession(authOptions);

    if (session) {
        // Already signed in → go to dashboard
        redirect("/dashboard");
    }

    return <LoginForm />;
}
