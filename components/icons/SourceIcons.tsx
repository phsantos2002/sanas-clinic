"use client";

import Image from "next/image";

type IconProps = {
  className?: string;
  size?: number;
};

export function MetaIcon({ className, size = 20 }: IconProps) {
  return <Image src="/icons/meta.svg" alt="Meta" width={size} height={size} className={className} />;
}

export function GoogleAdsIcon({ className, size = 20 }: IconProps) {
  return <Image src="/icons/google-ads.svg" alt="Google Ads" width={size} height={size} className={className} />;
}

export function WhatsAppIcon({ className, size = 20 }: IconProps) {
  return <Image src="/icons/whatsapp.svg" alt="WhatsApp" width={size} height={size} className={className} />;
}

export function MessengerIcon({ className, size = 20 }: IconProps) {
  return <Image src="/icons/messenger.svg" alt="Messenger" width={size} height={size} className={className} />;
}

export function InstagramIcon({ className, size = 20 }: IconProps) {
  return <Image src="/icons/instagram.svg" alt="Instagram" width={size} height={size} className={className} />;
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
