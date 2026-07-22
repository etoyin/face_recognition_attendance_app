import type { ReactNode } from "react";

type SectionCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function SectionCard({
  eyebrow,
  title,
  description,
  children,
}: SectionCardProps) {
  return (
    <section className="rounded-[28px] border border-white/12 bg-[#0c1531]/70 p-6 shadow-[0_24px_80px_rgba(4,8,25,0.45)] backdrop-blur">
      <div className="mb-5 flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-300/80">
          {eyebrow}
        </p>
        <h2 className="font-serif text-2xl text-white">{title}</h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-300">
          {description}
        </p>
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}
