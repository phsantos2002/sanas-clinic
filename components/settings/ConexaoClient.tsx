"use client";

import { useState } from "react";
import { QrCode, BadgeCheck } from "lucide-react";
import { ConnectionsClient } from "@/components/settings/ConnectionsClient";
import { WhatsAppConfigForm } from "@/components/forms/WhatsAppConfigForm";
import type { ConnectionData } from "@/app/actions/connections";
import type { AttendantData } from "@/app/actions/whatsappHub";

// Tipo do config oficial (WhatsAppConfig) — igual ao form legado.
type OfficialConfig = React.ComponentProps<typeof WhatsAppConfigForm>["config"];

type Props = {
  connections: ConnectionData[];
  attendants: AttendantData[];
  officialConfig: OfficialConfig;
};

export function ConexaoClient({ connections, attendants, officialConfig }: Props) {
  const [mode, setMode] = useState<"qr" | "oficial">("qr");

  return (
    <div className="space-y-4">
      {/* Escolha do tipo de conexão */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("qr")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
            mode === "qr"
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
          }`}
        >
          <QrCode className="h-4 w-4" />
          Não oficial (QR Code)
        </button>
        <button
          onClick={() => setMode("oficial")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
            mode === "oficial"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
          }`}
        >
          <BadgeCheck className="h-4 w-4" />
          WhatsApp Oficial (Meta)
        </button>
      </div>

      {mode === "qr" ? (
        <p className="text-xs text-slate-400">
          Conecte um ou mais números via QR Code — um por vendedor. As respostas saem sempre pelo
          número que o lead chamou.
        </p>
      ) : (
        <p className="text-xs text-slate-400">
          API oficial do WhatsApp (Meta Cloud). Requer conta Meta Business verificada e número
          dedicado. Configure Phone Number ID, Access Token e Verify Token abaixo.
        </p>
      )}

      <div className="bg-white border border-slate-100 rounded-2xl p-6">
        {mode === "qr" ? (
          <ConnectionsClient connections={connections} attendants={attendants} />
        ) : (
          <WhatsAppConfigForm config={officialConfig} officialOnly />
        )}
      </div>
    </div>
  );
}
