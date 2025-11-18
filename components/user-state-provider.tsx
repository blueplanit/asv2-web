// components/user-state-provider.tsx
"use client";

import { createContext, useContext, useState } from "react";
import type { UserState } from "@/lib/user-state";

type UserStateContextValue = {
    user: UserState;
    setUser: React.Dispatch<React.SetStateAction<UserState>>;
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

    return (
        <UserStateContext.Provider value={{ user, setUser }}>
            {children}
        </UserStateContext.Provider>
    );
}

export function useUserState() {
    const ctx = useContext(UserStateContext);
    if (!ctx) throw new Error("useUserState must be used within UserStateProvider");
    return ctx; // { state, setState }
}
