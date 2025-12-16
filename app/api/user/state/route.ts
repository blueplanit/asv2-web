// app/api/user/state/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { loadUserState } from "@/lib/user-state";

export const runtime = "nodejs";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }
    const userId = (session.user as any).userId as string;

    const userState = await loadUserState(userId);
    return NextResponse.json(userState);
}
