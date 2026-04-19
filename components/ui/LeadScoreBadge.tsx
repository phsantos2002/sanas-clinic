"use client";

const SCORE_CONFIG = {
  vip: {
    bg: "bg-violet-100",
    text: "text-violet-700",
    border: "border-violet-200",
    bar: "bg-violet-500",
    label: "VIP",
  },
  quente: {
    bg: "bg-rose-100",
    text: "text-rose-700",
    border: "border-rose-200",
    bar: "bg-rose-500",
    label: "Quente",
  },
  morno: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    border: "border-amber-200",
    bar: "bg-amber-500",
    label: "Morno",
  },
  frio: {
    bg: "bg-slate-100",
    text: "text-slate-500",
    border: "border-slate-200",
    bar: "bg-slate-400",
    label: "Frio",
  },
} as const;

function getConfig(label: string | null | undefined) {
  return SCORE_CONFIG[label as keyof typeof SCORE_CONFIG] || SCORE_CONFIG.frio;
}

const SCORE_TIPS = [
  "Progressao de estagio (+15/estagio)",
  "Quantidade de mensagens (+2/msg)",
  "Recencia da interacao (ate +20)",
  "Email preenchido (+5)",
  "Qualidade da fonte (ate +10)",
  "IA habilitada (+3)",
];

type Props = {
  score: number;
  label?: string | null;
  variant?: "compact" | "full";
};

export function LeadScoreBadge({ score, label, variant = "compact" }: Props) {
  const cfg = getConfig(label);

  if (variant === "compact") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${cfg.bg} ${cfg.text} border ${cfg.border}`}
        title={`Score: ${score}/100 (${cfg.label})`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${cfg.bar}`} />
        {score}
      </span>
    );
  }

  return (
    <div className="group relative">
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${cfg.border} ${cfg.bg}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${cfg.text}`}>{score}</span>
            <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
          </div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-white/60">
            <div
              className={`h-full rounded-full ${cfg.bar} transition-all`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tooltip */}
      <div className="invisible group-hover:visible absolute bottom-full left-0 mb-2 w-56 p-3 rounded-lg bg-slate-800 text-white text-xs shadow-xl z-50 transition-all opacity-0 group-hover:opacity-100">
        <p className="font-semibold mb-1.5">O que influencia o score:</p>
        <ul className="space-y-0.5">
          {SCORE_TIPS.map((tip) => (
            <li key={tip} className="text-slate-300">
              • {tip}
            </li>
          ))}
        </ul>
        <div className="absolute bottom-0 left-4 translate-y-1/2 rotate-45 h-2 w-2 bg-slate-800" />
      </div>
    </div>
  );
}
