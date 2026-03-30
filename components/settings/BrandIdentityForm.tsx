"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { BrandIdentity } from "@/app/actions/brandSettings";
import { saveBrandIdentity } from "@/app/actions/brandSettings";

const BUSINESS_TYPES = [
  { value: "", label: "Selecione..." },
  { value: "clinica_estetica", label: "Clinica de Estetica" },
  { value: "clinica_odontologica", label: "Clinica Odontologica" },
  { value: "salao_beleza", label: "Salao de Beleza" },
  { value: "barbearia", label: "Barbearia" },
  { value: "academia", label: "Academia / Personal" },
  { value: "restaurante", label: "Restaurante / Food" },
  { value: "loja_roupas", label: "Loja de Roupas" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "servicos", label: "Servicos em Geral" },
  { value: "saude", label: "Saude / Consultorio" },
  { value: "educacao", label: "Educacao / Cursos" },
  { value: "imobiliaria", label: "Imobiliaria" },
  { value: "outro", label: "Outro" },
];

const TONES = [
  { value: "profissional", label: "Profissional e confiavel" },
  { value: "acolhedor", label: "Profissional e acolhedor" },
  { value: "descontraido", label: "Descontraido e divertido" },
  { value: "luxo", label: "Sofisticado e premium" },
  { value: "jovem", label: "Jovem e dinamico" },
  { value: "tecnico", label: "Tecnico e educativo" },
];

export function BrandIdentityForm({ initial }: { initial: BrandIdentity }) {
  const [brand, setBrand] = useState<BrandIdentity>(initial);
  const [saving, setSaving] = useState(false);

  const update = (field: keyof BrandIdentity, value: string) => {
    setBrand((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await saveBrandIdentity(brand);
    setSaving(false);
    if (result.success) {
      toast.success("Identidade visual salva!");
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Colors */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">
            Cor primaria
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={brand.primary_color || "#7C3AED"}
              onChange={(e) => update("primary_color", e.target.value)}
              className="h-9 w-9 rounded-lg border border-slate-200 cursor-pointer"
            />
            <input
              type="text"
              value={brand.primary_color || "#7C3AED"}
              onChange={(e) => update("primary_color", e.target.value)}
              placeholder="#7C3AED"
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">
            Cor secundaria
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={brand.secondary_color || "#EC4899"}
              onChange={(e) => update("secondary_color", e.target.value)}
              className="h-9 w-9 rounded-lg border border-slate-200 cursor-pointer"
            />
            <input
              type="text"
              value={brand.secondary_color || "#EC4899"}
              onChange={(e) => update("secondary_color", e.target.value)}
              placeholder="#EC4899"
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Business Type */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1 block">
          Tipo de negocio
        </label>
        <select
          value={brand.business_type || ""}
          onChange={(e) => update("business_type", e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          {BUSINESS_TYPES.map((bt) => (
            <option key={bt.value} value={bt.value}>
              {bt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tone */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1 block">
          Tom de voz padrao
        </label>
        <select
          value={brand.default_tone || "profissional"}
          onChange={(e) => update("default_tone", e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          {TONES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Target Audience */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1 block">
          Publico-alvo
        </label>
        <textarea
          value={brand.target_audience || ""}
          onChange={(e) => update("target_audience", e.target.value)}
          placeholder="Ex: Mulheres 25-45 anos, classe B+, interessadas em estetica e autocuidado, regiao de Sao Paulo"
          rows={2}
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar Identidade Visual"}
      </button>
    </div>
  );
}
