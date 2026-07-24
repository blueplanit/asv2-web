"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import ReCAPTCHA from "react-google-recaptcha";

const COMMISSION_TEMPLATE_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1Cb4xUlqlWGOmVqTnU_19gykJs6Zy-GYlfe4Z63Xxl5I/view?usp=sharing";

// Public site key, taken from the original MailerLite embed. MailerLite holds
// the matching secret and verifies the token server-side, so this exact key
// must be reused — a different key would fail their check. It's a v2 checkbox
// key, hence the "I'm not a robot" widget below.
const RECAPTCHA_SITE_KEY = "6Lf1KHQUAAAAAFNKEX1hdSWCS3mRMv4FlFaNslaD";

type Status = "idle" | "submitting" | "success" | "error";

export function MailerLiteCommissionForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  function resetRecaptcha() {
    recaptchaRef.current?.reset();
    setRecaptchaToken(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!recaptchaToken) {
      setStatus("error");
      setError("Please confirm you're not a robot.");
      return;
    }

    setStatus("submitting");
    setError(null);

    try {
      const res = await fetch("/api/newsletter/commission-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, recaptchaToken }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error ?? "Something went wrong. Please try again.");
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
      // reCAPTCHA v2 tokens are single-use; force a fresh challenge before retry.
      resetRecaptcha();
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl mx-auto mb-20 w-2/5 border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">You're all set</h3>
        <p className="mt-2 text-sm text-slate-600">
          Your commission tracker template is ready. Open it and make your own
          copy to get started.
        </p>
        <a
          href={COMMISSION_TEMPLATE_SHEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Open your template
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto mb-20 max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">
        Free resource
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
        Free Stripe Commission Tracker
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
        A Google Sheet that calculates rep commissions and partner revenue share from Stripe -
        net of fees and refunds.
      </p>

      <label
        htmlFor="commission-email"
        className="mt-7 block text-sm font-medium text-slate-900"
      >
        Email address
      </label>
      <input
        id="commission-email"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        disabled={status === "submitting"}
        placeholder="hello@company.com"
        className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60"
      />

      <div className="mt-4 flex justify-center">
        <ReCAPTCHA
          ref={recaptchaRef}
          sitekey={RECAPTCHA_SITE_KEY}
          onChange={(token: string | null) => setRecaptchaToken(token)}
          onExpired={() => setRecaptchaToken(null)}
          onErrored={() => setRecaptchaToken(null)}
        />
      </div>

      {status === "error" && error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "submitting" || !recaptchaToken}
        className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "submitting" ? "Sending…" : "Send me the template"}
      </button>

      <p className="mt-3 text-xs text-slate-500">
        You can unsubscribe anytime. For more details, review our{" "}
        <Link href="/pages/privacy-policy" className="underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}
