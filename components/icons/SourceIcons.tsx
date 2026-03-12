"use client";

type IconProps = {
  className?: string;
  size?: number;
};

export function MetaIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M6.915 4.03c-1.544 0-2.85 1.275-3.639 2.9-.453.937-.725 2.024-.725 3.07 0 1.045.272 2.133.725 3.07.789 1.625 2.095 2.9 3.639 2.9 1.071 0 1.875-.492 2.544-1.195.624-.656 1.143-1.5 1.604-2.376l.472-.898.472.898c.461.876.98 1.72 1.604 2.376.669.703 1.473 1.195 2.544 1.195 1.544 0 2.85-1.275 3.639-2.9.453-.937.725-2.025.725-3.07 0-1.046-.272-2.133-.725-3.07-.789-1.625-2.095-2.9-3.639-2.9-1.071 0-1.875.492-2.544 1.195-.624.656-1.143 1.5-1.604 2.376L12 8.5l-.472-.899c-.461-.876-.98-1.72-1.604-2.376C9.255 4.522 8.451 4.03 7.38 4.03h-.465z"
        fill="#0081FB"
      />
    </svg>
  );
}

export function GoogleAdsIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path d="M3.272 16.092l5.443-9.39 3.846 2.23-5.443 9.39z" fill="#FBBC04" />
      <path d="M21.177 16.092l-5.443-9.39-3.846 2.23 5.443 9.39z" fill="#4285F4" />
      <circle cx="5.512" cy="17.208" r="2.792" fill="#34A853" />
    </svg>
  );
}

export function WhatsAppIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"
        fill="#25D366"
      />
      <path
        d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 01-4.107-1.138l-.293-.175-2.86.85.85-2.86-.175-.293A7.96 7.96 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"
        fill="#25D366"
      />
    </svg>
  );
}

export function GlobeIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0EA5E9"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  );
}

export function ManualIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#8B5CF6"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

export function UnknownSourceIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#F97316"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function ChatBubbleIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#6366F1"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

// Map source key to icon component
export function SourceIcon({ source, size = 20, className }: { source: string | null; size?: number; className?: string }) {
  switch (source) {
    case "meta":
      return <MetaIcon size={size} className={className} />;
    case "google":
      return <GoogleAdsIcon size={size} className={className} />;
    case "whatsapp":
      return <WhatsAppIcon size={size} className={className} />;
    case "manual":
      return <ManualIcon size={size} className={className} />;
    case "unknown":
      return <UnknownSourceIcon size={size} className={className} />;
    default:
      return <UnknownSourceIcon size={size} className={className} />;
  }
}

// Source metadata (labels, colors, subtitles)
export const sourceConfig: Record<string, { label: string; subtitle: string; bg: string; border: string; text: string }> = {
  meta: {
    label: "Meta Ads",
    subtitle: "Facebook & Instagram",
    bg: "bg-blue-50",
    border: "border-blue-100",
    text: "text-blue-700",
  },
  google: {
    label: "Google Ads",
    subtitle: "Search & Display",
    bg: "bg-amber-50",
    border: "border-amber-100",
    text: "text-amber-700",
  },
  whatsapp: {
    label: "WhatsApp",
    subtitle: "Mensagem Direta",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    text: "text-emerald-700",
  },
  manual: {
    label: "Manual",
    subtitle: "Cadastro Manual",
    bg: "bg-violet-50",
    border: "border-violet-100",
    text: "text-violet-700",
  },
  unknown: {
    label: "Não Rastreada",
    subtitle: "Origem desconhecida",
    bg: "bg-orange-50",
    border: "border-orange-100",
    text: "text-orange-700",
  },
};

// Stage color map for badges
export const stageColors: Record<string, { bg: string; text: string }> = {
  "Novo Lead": { bg: "bg-blue-100", text: "text-blue-700" },
  "Atendido": { bg: "bg-cyan-100", text: "text-cyan-700" },
  "Qualificado": { bg: "bg-violet-100", text: "text-violet-700" },
  "Agendado": { bg: "bg-amber-100", text: "text-amber-700" },
  "Cliente": { bg: "bg-emerald-100", text: "text-emerald-700" },
};

export function getStageColor(name: string) {
  return stageColors[name] ?? { bg: "bg-slate-100", text: "text-slate-700" };
}
