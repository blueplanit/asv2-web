// components/user-state-provider.tsx
"use client";

import { createContext, useContext, useState } from "react";
import type { UserState } from "@/lib/app-state/user-state";

type UserStateContextValue = {
    user: UserState;
    setUser: React.Dispatch<React.SetStateAction<UserState>>;
    refresh: () => Promise<void>;
};

const UserStateContext = createContext<UserStateContextValue | null>(null);

export function UserStateProvider({
    initialState,
    children,
}: {
    initialState: UserState;
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<UserState>(initialState);

    async function refresh() {
        const res = await fetch("/api/user/state", { cache: "no-store" });
        if (!res.ok) return; // optionally toast an error
        const next: UserState = await res.json();
        setUser(next);
    }

    return (
        <UserStateContext.Provider value={{ user, setUser, refresh }}>
            {children}
        </UserStateContext.Provider>
    );
}

export function useUserState() {
    const ctx = useContext(UserStateContext);
    if (!ctx) throw new Error("useUserState must be used within UserStateProvider");
    return ctx; // { user, setUser, refresh }
}
