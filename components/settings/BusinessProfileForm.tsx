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
  "clinica_estetica", "clinica_odontologica", "salao_beleza", "barbearia",
  "academia", "restaurante", "loja_roupas", "ecommerce", "servicos",
  "saude", "educacao", "imobiliaria", "outro",
];

const NICHE_LABELS: Record<string, string> = {
  clinica_estetica: "Clinica de Estetica", clinica_odontologica: "Clinica Odontologica",
  salao_beleza: "Salao de Beleza", barbearia: "Barbearia", academia: "Academia / Personal",
  restaurante: "Restaurante / Food", loja_roupas: "Loja de Roupas", ecommerce: "E-commerce",
  servicos: "Servicos em Geral", saude: "Saude / Consultorio", educacao: "Educacao / Cursos",
  imobiliaria: "Imobiliaria", outro: "Outro",
};

export function BusinessProfileForm({ initial, onSave }: {
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
        <input type="text" value={profile.name || ""} onChange={(e) => update("name", e.target.value)}
          placeholder="Ex: Clinica Sanas" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Nicho</label>
          <select value={profile.niche || ""} onChange={(e) => update("niche", e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Selecione...</option>
            {NICHES.map((n) => <option key={n} value={n}>{NICHE_LABELS[n]}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Cidade</label>
          <input type="text" value={profile.city || ""} onChange={(e) => update("city", e.target.value)}
            placeholder="Ex: Sao Paulo - SP" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1 block">Servicos oferecidos</label>
        <textarea value={profile.services || ""} onChange={(e) => update("services", e.target.value)} rows={2}
          placeholder="Ex: Botox, Harmonizacao Facial, Preenchimento Labial, Limpeza de Pele"
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Ticket medio (R$)</label>
          <input type="text" value={profile.avgTicket || ""} onChange={(e) => update("avgTicket", e.target.value)}
            placeholder="Ex: 500" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Diferenciais</label>
          <input type="text" value={profile.differentials || ""} onChange={(e) => update("differentials", e.target.value)}
            placeholder="Ex: Atendimento premium, 10 anos de experiencia"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>
      <button onClick={handleSave} disabled={saving}
        className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50">
        {saving ? "Salvando..." : "Salvar Perfil"}
      </button>
    </div>
  );
}
