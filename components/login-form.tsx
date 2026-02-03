// components/login-form.tsx
"use client";

import { APP_NAME } from "@/lib/constants";
import { signIn } from "next-auth/react";

export function LoginForm() {
    return (
        <div className="min-h-[75vh] bg-gradient-to-b from-slate-50 via-white to-slate-50 flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
                <div className="space-y-2 text-center">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                        {APP_NAME}
                    </p>
                    <h1 className="text-2xl font-semibold text-slate-900">
                        Sign in with Google
                    </h1>
                    <p className="text-sm text-slate-600">
                        Use your Google account to access your {APP_NAME} workspace.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                    className="cursor-pointer flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                >
                    <span className="inline-flex size-5 items-center justify-center rounded bg-white/10">
                        G
                    </span>
                    Continue with Google
                </button>

                <p className="text-xs text-slate-500 text-center">
                    We only use your email and basic profile to create your account.
                </p>
            </div>
        </div>
    );
}
