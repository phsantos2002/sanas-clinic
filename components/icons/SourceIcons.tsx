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
      viewBox="0 0 800 800"
      fill="none"
      className={className}
    >
      <path
        d="M162.562 540.137C162.562 565.239 168.878 583.94 181.227 596.241C193.576 608.542 210.337 614.693 231.511 614.693C259.78 614.693 284.903 602.533 306.882 578.214C331.539 550.898 354.187 508.093 374.826 449.798L389.723 406.993C411.236 344.395 437.232 296.651 467.711 263.762C504.339 224.339 545.892 204.627 592.371 204.627C639.934 204.627 679.534 224.082 711.171 263.07C745.178 305.184 762.182 360.147 762.182 427.958C762.182 472.493 753.879 512.244 737.274 547.21C720.669 582.176 698.286 609.139 670.125 628.098L631.849 594.538C654.664 579.573 672.608 559.044 685.68 532.952C698.752 506.86 705.288 477.294 705.288 444.214C705.288 393.604 693.131 353.018 668.817 322.458C644.503 291.898 613.852 276.618 576.864 276.618C545.071 276.618 516.476 292.299 491.08 323.661C471.55 347.462 453.107 382.284 435.754 428.128L420.857 470.932C397.667 538.744 372.692 589.764 345.934 623.992C310.654 669.053 271.001 691.583 227.006 691.583C190.641 691.583 161.294 679.118 138.964 654.188C118.264 631.271 107.914 601.247 107.914 564.116C107.914 524.638 117.888 486.78 137.836 450.542L182.489 475.068C166.538 504.224 162.562 524.11 162.562 540.137Z"
        fill="#0081FB"
      />
      <path
        d="M576.864 276.618C545.071 276.618 516.476 292.299 491.08 323.661C471.55 347.462 453.107 382.284 435.754 428.128L420.857 470.932C397.667 538.744 372.692 589.764 345.934 623.992C310.654 669.053 271.001 691.583 227.006 691.583C190.641 691.583 161.294 679.118 138.964 654.188C118.264 631.271 107.914 601.247 107.914 564.116C107.914 524.638 117.888 486.78 137.836 450.542L182.489 475.068C166.538 504.224 162.562 524.11 162.562 540.137C162.562 565.239 168.878 583.94 181.227 596.241C193.576 608.542 210.337 614.693 231.511 614.693C259.78 614.693 284.903 602.533 306.882 578.214C331.539 550.898 354.187 508.093 374.826 449.798L389.723 406.993C411.236 344.395 437.232 296.651 467.711 263.762C504.339 224.339 545.892 204.627 592.371 204.627C639.934 204.627 679.534 224.082 711.171 263.07C745.178 305.184 762.182 360.147 762.182 427.958C762.182 472.493 753.879 512.244 737.274 547.21C720.669 582.176 698.286 609.139 670.125 628.098L631.849 594.538C654.664 579.573 672.608 559.044 685.68 532.952C698.752 506.86 705.288 477.294 705.288 444.214C705.288 393.604 693.131 353.018 668.817 322.458C644.503 291.898 613.852 276.618 576.864 276.618Z"
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
      viewBox="0 0 192 192"
      fill="none"
      className={className}
    >
      <path d="M12.213 144.384l52.234-90.467 31.673 18.287-52.234 90.467z" fill="#FBBC04" />
      <path d="M179.787 144.384l-52.234-90.467-31.673 18.287 52.234 90.467z" fill="#4285F4" />
      <circle cx="34.324" cy="152.384" r="23.613" fill="#34A853" />
    </svg>
  );
}

export function WhatsAppIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 448 512"
      fill="none"
      className={className}
    >
      <path
        d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"
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
