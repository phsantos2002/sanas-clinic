"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  saveEnrichmentSettings,
  type EnrichmentSettings,
} from "@/app/actions/enrichment";

const PROVIDERS = [
  { id: "none", label: "Desativado", desc: "Sem enriquecimento" },
  { id: "apollo", label: "Apollo.io", desc: "~US$ 49/mês · dados B2B ricos" },
  { id: "hunter", label: "Hunter.io", desc: "Free tier · busca emails por domínio" },
] as const;

export function EnrichmentForm({ initial }: { initial: EnrichmentSettings }) {
  const [provider, setProvider] = useState<EnrichmentSettings["provider"]>(initial.provider);
  const [apolloApiKey, setApolloApiKey] = useState(initial.apolloApiKey);
  const [hunterApiKey, setHunterApiKey] = useState(initial.hunterApiKey);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const r = await saveEnrichmentSettings({ provider, apolloApiKey, hunterApiKey });
    setSaving(false);
    if (r.success) toast.success("Enriquecimento salvo");
    else toast.error(r.error);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-700 mb-2 block">Provedor</label>
        <div className="grid grid-cols-3 gap-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => setProvider(p.id)}
              className={`flex flex-col items-start p-3 rounded-xl text-xs border-2 transition-all ${
                provider === p.id
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                  : "bg-slate-50 text-slate-500 border-transparent hover:bg-slate-100"
              }`}
            >
              <span className="font-semibold">{p.label}</span>
              <span className="text-[10px] mt-0.5 opacity-70 text-left">{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {provider === "apollo" && (
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Chave Apollo.io</label>
          <input
            type="password"
            value={apolloApiKey}
            onChange={(e) => setApolloApiKey(e.target.value)}
            placeholder="Cole sua API key"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-slate-400 mt-1">
            Obtenha em app.apollo.io/settings/integrations/api
          </p>
        </div>
      )}

      {provider === "hunter" && (
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Chave Hunter.io</label>
          <input
            type="password"
            value={hunterApiKey}
            onChange={(e) => setHunterApiKey(e.target.value)}
            placeholder="Cole sua API key"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-slate-400 mt-1">
            Obtenha em hunter.io/api-keys. Free tier = 25 requests/mês.
          </p>
        </div>
      )}

      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-800 flex items-start gap-2">
        <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          Com enriquecimento ativo, SDRs podem clicar em &quot;Enriquecer lead&quot; no card
          e o sistema puxa email, cargo, LinkedIn e setor automaticamente. Funciona
          tanto para B2C (Hunter busca por nome+domínio) quanto B2B (Apollo retorna
          dados de empresa).
        </span>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar"}
      </button>
    </div>
  );
}
