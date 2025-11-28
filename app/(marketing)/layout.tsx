import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { SiteHeader } from "@/components/layout/site-header";
import { signOut } from "next-auth/react";


export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);
    const isAuthed = !!session?.user;
    const userEmail = session?.user?.email ?? null;
    return (
        <div className="min-h-screen flex flex-col">
            <SiteHeader 
            variant="public" 
            isAuthed={isAuthed}
            userEmail={userEmail}/>
            <div className="flex-1">{children}</div>
        </div>
    );
}
