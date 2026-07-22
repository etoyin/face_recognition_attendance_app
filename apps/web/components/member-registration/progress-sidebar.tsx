import { CheckCircle2, Circle, LoaderCircle } from "lucide-react";

export type ProgressSidebarStep = {
  title: string;
  description: string;
  complete: boolean;
  available: boolean;
};

type ProgressSidebarProps = {
  captureCount: number;
  isSubmitting: boolean;
  currentStep: number;
  steps: ProgressSidebarStep[];
  onStepSelect: (stepIndex: number) => void;
};

export function ProgressSidebar({
  captureCount,
  isSubmitting,
  currentStep,
  steps,
  onStepSelect,
}: ProgressSidebarProps) {
  return (
    <aside className="sticky top-8 rounded-[28px] border border-white/12 bg-[#13204a]/80 p-6 shadow-[0_18px_60px_rgba(5,10,30,0.45)] backdrop-blur">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-300/75">
          Registration flow
        </p>
        <h2 className="mt-3 font-serif text-3xl text-white">
          Member onboarding
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Complete each step in order. The next stage unlocks only after the
          current one is ready.
        </p>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => {
          return (
            <button
              type="button"
              key={step.title}
              onClick={() => onStepSelect(index)}
              disabled={!step.available}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                currentStep === index
                  ? "border-amber-300/40 bg-amber-300/10"
                  : "border-white/8 bg-white/5"
              } ${step.available ? "hover:bg-white/10" : "cursor-not-allowed opacity-60"}`}
            >
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                  Step {index + 1}
                </p>
                <p className="mt-1 text-sm font-medium text-white">{step.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  {step.description}
                </p>
              </div>

              {step.complete ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
              ) : (
                <Circle className="h-5 w-5 text-slate-500" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-amber-200/20 bg-amber-200/10 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-amber-100">Capture progress</p>
          <p className="text-sm text-amber-200">{captureCount} / 30</p>
        </div>
        <div className="mt-3 h-2 rounded-full bg-white/10">
          <div
            className="h-2 rounded-full bg-amber-300 transition-all"
            style={{ width: `${Math.min((captureCount / 30) * 100, 100)}%` }}
          />
        </div>
        <p className="mt-3 text-xs leading-5 text-amber-50/80">
          All 30 guided captures must be completed before final submission unlocks.
        </p>
      </div>

      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
        {isSubmitting ? (
          <LoaderCircle className="h-5 w-5 animate-spin text-amber-300" />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-emerald-300" />
        )}
        <span>
          {isSubmitting
            ? "Saving registration and committing temporary assets."
            : "Ready for controlled submission and success handoff."}
        </span>
      </div>
    </aside>
  );
}
