import Link from "next/link";

type SuccessPageProps = {
  params: Promise<{ memberId: string }>;
  searchParams: Promise<{
    membershipId?: string;
    fullName?: string;
    captureCount?: string;
  }>;
};

export default async function RegistrationSuccessPage({
  params,
  searchParams,
}: SuccessPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#1a2857_0%,#091127_48%,#040814_100%)] px-6 py-10">
      <div className="w-full max-w-3xl rounded-[32px] border border-emerald-300/20 bg-[#0c1531]/80 p-8 shadow-[0_24px_120px_rgba(0,0,0,0.35)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-300/80">
          Registration completed
        </p>
        <h1 className="mt-4 font-serif text-4xl text-white">
          {resolvedSearchParams.fullName ?? "Member"} has been registered
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          The member profile, temporary profile photo, and guided face capture
          set have been successfully committed.
        </p>

        <div className="mt-8 grid gap-4 rounded-[28px] border border-white/10 bg-white/5 p-6 md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
              Member ID
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {resolvedParams.memberId}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
              Membership ID
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {resolvedSearchParams.membershipId ?? "Generated"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
              Face captures
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {resolvedSearchParams.captureCount ?? "0"} confirmed
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/dashboard/members/register"
            className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
          >
            Register another member
          </Link>
          <Link
            href={`/dashboard/members/${resolvedParams.memberId}`}
            className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/8"
          >
            Open member profile
          </Link>
        </div>
      </div>
    </main>
  );
}
