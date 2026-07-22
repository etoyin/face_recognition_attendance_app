import Link from "next/link";

type MemberProfilePageProps = {
  params: Promise<{ memberId: string }>;
};

export default async function MemberProfilePage({
  params,
}: MemberProfilePageProps) {
  const resolvedParams = await params;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#040814] px-6 py-10">
      <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-300/80">
          Member profile handoff
        </p>
        <h1 className="mt-4 font-serif text-4xl">
          Member record {resolvedParams.memberId}
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          This route is the post-registration destination for the next profile
          module. The registration workflow already links here after a successful
          save.
        </p>
        <Link
          href="/dashboard/members/register"
          className="mt-8 inline-flex rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
        >
          Back to registration
        </Link>
      </div>
    </main>
  );
}
