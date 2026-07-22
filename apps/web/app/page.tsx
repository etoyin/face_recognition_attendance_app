import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#1a2857_0%,#091127_48%,#040814_100%)] px-6 py-10">
      <div className="w-full max-w-4xl rounded-[32px] border border-white/12 bg-white/5 p-8 shadow-[0_24px_120px_rgba(0,0,0,0.35)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-300/80">
          AI church attendance
        </p>
        <h1 className="mt-4 max-w-2xl font-serif text-5xl text-white">
          Member registration with guided face enrollment
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
          Start the desktop-first onboarding workflow for member identity,
          ministry placement, temporary media uploads, and guided camera capture.
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/dashboard/members/register"
            className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
          >
            Open registration module
          </Link>
        </div>
      </div>
    </main>
  );
}
