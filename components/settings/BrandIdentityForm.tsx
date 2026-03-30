"use client";

import { useState, useRef } from "react";
import { Upload, X, Palette } from "lucide-react";
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

const FONTS = [
  { value: "Inter", label: "Inter" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Poppins", label: "Poppins" },
  { value: "Roboto", label: "Roboto" },
  { value: "Open Sans", label: "Open Sans" },
  { value: "Playfair Display", label: "Playfair Display" },
  { value: "Lato", label: "Lato" },
  { value: "Raleway", label: "Raleway" },
];

export function BrandIdentityForm({ initial }: { initial: BrandIdentity }) {
  const [brand, setBrand] = useState<BrandIdentity>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (field: keyof BrandIdentity, value: string) => {
    setBrand((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens sao aceitas");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Maximo 5MB");
      return;
    }

    setUploading(true);
    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Erro no upload");
      const data = await res.json();
      update("logo_url", data.url);
      toast.success("Logo enviado!");
    } catch {
      toast.error("Erro ao enviar logo");
    } finally {
      setUploading(false);
    }
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

  const primaryColor = brand.primary_color || "#7C3AED";
  const secondaryColor = brand.secondary_color || "#EC4899";

  return (
    <div className="space-y-4">
      {/* Logo Upload */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-2 block">
          Logo da empresa
        </label>
        <div className="flex items-center gap-4">
          {brand.logo_url ? (
            <div className="relative h-16 w-16 rounded-xl overflow-hidden border border-slate-200">
              <img src={brand.logo_url} alt="Logo" className="h-full w-full object-cover" />
              <button
                onClick={() => update("logo_url", "")}
                className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="h-16 w-16 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center hover:border-slate-300 transition-colors"
            >
              {uploading ? (
                <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="h-5 w-5 text-slate-300" />
              )}
            </button>
          )}
          <div className="text-xs text-slate-400">
            <p>PNG, JPG ou SVG</p>
            <p>Maximo 5MB</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleLogoUpload(file);
            }}
          />
        </div>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">
            Cor primaria
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => update("primary_color", e.target.value)}
              className="h-9 w-9 rounded-lg border border-slate-200 cursor-pointer"
            />
            <input
              type="text"
              value={primaryColor}
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
              value={secondaryColor}
              onChange={(e) => update("secondary_color", e.target.value)}
              className="h-9 w-9 rounded-lg border border-slate-200 cursor-pointer"
            />
            <input
              type="text"
              value={secondaryColor}
              onChange={(e) => update("secondary_color", e.target.value)}
              placeholder="#EC4899"
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Font Selector */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1 block">
          Fonte preferida
        </label>
        <select
          value={brand.font || "Inter"}
          onChange={(e) => update("font", e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          {FONTS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
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

      {/* Live Preview */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-1.5">
          <Palette className="h-4 w-4" />
          Preview
        </label>
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
          <div className="flex items-center gap-3 mb-3">
            {brand.logo_url ? (
              <img src={brand.logo_url} alt="Logo" className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: primaryColor }}
              >
                {(brand.business_type || "L").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-slate-900 text-sm" style={{ fontFamily: brand.font || "Inter" }}>
                Sua Empresa
              </p>
              <p className="text-xs text-slate-400">
                {BUSINESS_TYPES.find((b) => b.value === brand.business_type)?.label || "Negocio"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <div
              className="h-8 flex-1 rounded-lg flex items-center justify-center text-white text-xs font-medium"
              style={{ backgroundColor: primaryColor }}
            >
              Botao Primario
            </div>
            <div
              className="h-8 flex-1 rounded-lg flex items-center justify-center text-white text-xs font-medium"
              style={{ backgroundColor: secondaryColor }}
            >
              Botao Secundario
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2" style={{ fontFamily: brand.font || "Inter" }}>
            Fonte: {brand.font || "Inter"} — Tom: {TONES.find((t) => t.value === (brand.default_tone || "profissional"))?.label}
          </p>
        </div>
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
