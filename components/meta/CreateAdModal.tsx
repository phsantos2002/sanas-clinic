"use client";

import { useState, useTransition, useRef } from "react";
import { Info, Plus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createAd } from "@/app/actions/meta";
import { CTA_OPTIONS } from "./shared";

type Props = {
  adSetId: string;
  adSetName: string;
  onClose: () => void;
  onCreated: () => void;
};

export function CreateAdModal({ adSetId, adSetName, onClose, onCreated }: Props) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [primaryText, setPrimaryText] = useState("");
  const [headline, setHeadline] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [cta, setCta] = useState("LEARN_MORE");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit() {
    if (!name.trim()) {
      toast.error("Nome do anúncio é obrigatório");
      return;
    }
    if (!primaryText.trim()) {
      toast.error("Texto principal é obrigatório");
      return;
    }
    if (!headline.trim()) {
      toast.error("Headline é obrigatória");
      return;
    }
    if (!linkUrl.trim()) {
      toast.error("URL de destino é obrigatória");
      return;
    }
    if (!imageBase64) {
      toast.error("Selecione uma imagem");
      return;
    }

    startTransition(async () => {
      const result = await createAd({
        adSetId,
        name: name.trim(),
        primaryText: primaryText.trim(),
        headline: headline.trim(),
        linkUrl: linkUrl.trim(),
        callToAction: cta,
        imageBase64,
      });
      if (result.success) {
        toast.success("Anúncio criado com sucesso! Status: Pausado");
        onCreated();
        onClose();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Novo Anúncio</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Conjunto: {adSetName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Image Upload */}
          <div>
            <Label className="text-xs font-medium text-slate-700">Imagem do anúncio</Label>
            <div className="mt-1.5">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-xl border border-slate-200"
                  />
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      setImageBase64(null);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                    className="absolute top-2 right-2 bg-white/90 rounded-full p-1 shadow-sm hover:bg-white"
                  >
                    <X className="h-3.5 w-3.5 text-slate-600" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
                >
                  <Upload className="h-6 w-6 text-slate-300" />
                  <span className="text-xs text-slate-400">Clique para selecionar imagem</span>
                  <span className="text-[10px] text-slate-300">JPG ou PNG, máx. 10MB</span>
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImage}
                className="hidden"
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <Label className="text-xs font-medium text-slate-700">Nome do anúncio</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: C4 TRAFEGO"
              className="mt-1 text-sm rounded-xl"
            />
          </div>

          {/* Primary Text */}
          <div>
            <Label className="text-xs font-medium text-slate-700">Texto principal</Label>
            <textarea
              value={primaryText}
              onChange={(e) => setPrimaryText(e.target.value)}
              placeholder="Texto que aparece acima da imagem no feed..."
              rows={3}
              className="mt-1 w-full text-sm rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Headline */}
          <div>
            <Label className="text-xs font-medium text-slate-700">Headline</Label>
            <Input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Título abaixo da imagem"
              className="mt-1 text-sm rounded-xl"
            />
          </div>

          {/* Link URL */}
          <div>
            <Label className="text-xs font-medium text-slate-700">URL de destino</Label>
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1 text-sm rounded-xl"
            />
          </div>

          {/* CTA */}
          <div>
            <Label className="text-xs font-medium text-slate-700">Botão de ação (CTA)</Label>
            <select
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              className="mt-1 w-full text-sm rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            >
              {CTA_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Info */}
          <div className="bg-blue-50 rounded-xl p-3 flex items-start gap-2">
            <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-blue-700 leading-relaxed">
              O anúncio será criado com status <span className="font-semibold">Pausado</span>. Após
              revisão, ative-o pelo botão de play. A página do Facebook vinculada à conta de
              anúncios será usada automaticamente.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs">
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-xl text-xs gap-1.5"
          >
            {isPending ? (
              "Criando..."
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" /> Criar Anúncio
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
