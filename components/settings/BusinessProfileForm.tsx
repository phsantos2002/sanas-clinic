"use client";

import { useState } from "react";
import { toast } from "sonner";

type BusinessProfile = {
  name?: string;
  niche?: string;
  city?: string;
  services?: string;
  avgTicket?: string;
  differentials?: string;
};

const NICHES = [
  "b2c_servicos",
  "b2c_varejo",
  "b2c_saude",
  "b2c_beleza",
  "b2c_alimentacao",
  "b2c_educacao",
  "b2c_fitness",
  "b2c_imobiliario",
  "b2b_servicos",
  "b2b_software",
  "b2b_consultoria",
  "b2b_industria",
  "b2b_agencia",
  "outro",
];

const NICHE_LABELS: Record<string, string> = {
  b2c_servicos: "B2C — Servicos locais",
  b2c_varejo: "B2C — Varejo / Loja",
  b2c_saude: "B2C — Saude / Consultorio",
  b2c_beleza: "B2C — Estetica / Beleza",
  b2c_alimentacao: "B2C — Alimentacao",
  b2c_educacao: "B2C — Educacao / Cursos",
  b2c_fitness: "B2C — Fitness / Academia",
  b2c_imobiliario: "B2C — Imobiliario",
  b2b_servicos: "B2B — Servicos profissionais",
  b2b_software: "B2B — Software / SaaS",
  b2b_consultoria: "B2B — Consultoria",
  b2b_industria: "B2B — Industria",
  b2b_agencia: "B2B — Agencia / Marketing",
  outro: "Outro",
};

export function BusinessProfileForm({
  initial,
  onSave,
}: {
  initial: BusinessProfile | null;
  onSave: (data: BusinessProfile) => Promise<{ success: boolean; error?: string }>;
}) {
  const [profile, setProfile] = useState<BusinessProfile>(initial || {});
  const [saving, setSaving] = useState(false);

  const update = (field: keyof BusinessProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await onSave(profile);
    setSaving(false);
    if (result.success) toast.success("Perfil salvo!");
    else toast.error(result.error || "Erro ao salvar");
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1 block">Nome do negocio</label>
        <input
          type="text"
          value={profile.name || ""}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Ex: Consultório Silva, Loja Moderna, Software XYZ..."
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Nicho</label>
          <select
            value={profile.niche || ""}
            onChange={(e) => update("niche", e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Selecione...</option>
            {NICHES.map((n) => (
              <option key={n} value={n}>
                {NICHE_LABELS[n]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Cidade</label>
          <input
            type="text"
            value={profile.city || ""}
            onChange={(e) => update("city", e.target.value)}
            placeholder="Ex: Sao Paulo - SP"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1 block">Servicos oferecidos</label>
        <textarea
          value={profile.services || ""}
          onChange={(e) => update("services", e.target.value)}
          rows={2}
          placeholder="Descreva o que você vende ou oferece (produtos, serviços, planos)."
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Ticket medio (R$)</label>
          <input
            type="text"
            value={profile.avgTicket || ""}
            onChange={(e) => update("avgTicket", e.target.value)}
            placeholder="Ex: 500"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Diferenciais</label>
          <input
            type="text"
            value={profile.differentials || ""}
            onChange={(e) => update("differentials", e.target.value)}
            placeholder="Ex: Atendimento premium, 10 anos de experiencia"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar Perfil"}
      </button>
    </div>
  );
}
