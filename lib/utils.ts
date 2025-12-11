import { clsx, type ClassValue } from "clsx"
import { Session } from "next-auth";
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isDevEnvironment() {
    return process.env.NODE_ENV === "development" || process.env.NEXTAUTH_URL?.includes("localhost");
}