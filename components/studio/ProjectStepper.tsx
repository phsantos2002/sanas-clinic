"use client";

import { Check, Clock, Loader2 } from "lucide-react";

type StepStatus = "pending" | "active" | "done" | "error";

type Step = {
  id: string;
  label: string;
  status: StepStatus;
  href?: string;
};

type Props = {
  steps: Step[];
  onClickStep?: (stepId: string) => void;
};

export function ProjectStepper({ steps, onClickStep }: Props) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <div key={step.id} className="flex items-center shrink-0">
            <button
              onClick={() => onClickStep?.(step.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                step.status === "done"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : step.status === "active"
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200 ring-1 ring-indigo-300"
                  : step.status === "error"
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-slate-50 text-slate-400 border border-slate-200"
              }`}
            >
              {step.status === "done" && <Check className="h-3 w-3" />}
              {step.status === "active" && <Loader2 className="h-3 w-3 animate-spin" />}
              {step.status === "pending" && <Clock className="h-3 w-3" />}
              {step.status === "error" && <span className="text-red-500">!</span>}
              {step.label}
            </button>
            {!isLast && (
              <div className={`w-6 h-0.5 mx-1 ${
                step.status === "done" ? "bg-emerald-300" : "bg-slate-200"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
