"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";
import { savePixel, saveCampaignObjective, testPixelConnection } from "@/app/actions/pixel";
import { toast } from "sonner";
import type { Pixel } from "@/types";

type Props = {
  pixel: Pixel | null;
};

const OBJECTIVE_OPTIONS = [
  { value: "", label: "Não configurado" },
  { value: "MESSAGES", label: "Mensagens" },
  { value: "CONVERSIONS", label: "Conversões" },
  { value: "LEADS", label: "Geração de Leads" },
  { value: "ENGAGEMENT", label: "Engajamento" },
  { value: "TRAFFIC", label: "Tráfego" },
];

const DESTINATION_OPTIONS = [
  { value: "", label: "Não configurado" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "WEBSITE", label: "Website / Landing Page" },
  { value: "INSTAGRAM", label: "Instagram Direct" },
  { value: "FORM", label: "Formulário Nativo" },
  { value: "STORE", label: "Loja / E-commerce" },
];

const BID_STRATEGY_OPTIONS = [
  { value: "", label: "Não configurado" },
  { value: "LOWEST_COST", label: "Menor Custo (automático)" },
  { value: "COST_CAP", label: "Cost Cap" },
  { value: "BID_CAP", label: "Bid Cap" },
  { value: "ROAS_MIN", label: "ROAS Mínimo" },
];

export function FacebookPixelForm({ pixel }: Props) {
  const [pixelId, setPixelId] = useState(pixel?.pixelId ?? "");
  const [accessToken, setAccessToken] = useState(pixel?.accessToken ?? "");
  const [adAccountId, setAdAccountId] = useState(pixel?.adAccountId ?? "");
  const [metaAdsToken, setMetaAdsToken] = useState(pixel?.metaAdsToken ?? "");
  const [campaignObjective, setCampaignObjective] = useState(pixel?.campaignObjective ?? "");
  const [conversionDestination, setConversionDestination] = useState(pixel?.conversionDestination ?? "");
  const [monthlyBudget, setMonthlyBudget] = useState(pixel?.monthlyBudget?.toString() ?? "");
  const [bidStrategy, setBidStrategy] = useState(pixel?.bidStrategy ?? "");
  const [loading, setLoading] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [testing, setTesting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pixelId.trim() || !accessToken.trim()) return;
    setLoading(true);
    const result = await savePixel(pixelId, accessToken, adAccountId, metaAdsToken);
    setLoading(false);
    if (result.success) {
      toast.success("Configurações do Pixel salvas");
    } else {
      toast.error(result.error);
    }
  }

  async function handleSaveCampaignConfig() {
    setSavingCampaign(true);
    const result = await saveCampaignObjective({
      campaignObjective: campaignObjective || "",
      conversionDestination: conversionDestination || "",
      monthlyBudget: monthlyBudget ? parseFloat(monthlyBudget) : null,
      bidStrategy: bidStrategy || null,
    });
    setSavingCampaign(false);
    if (result.success) {
      toast.success("Configuração de campanha salva");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-6 max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="pixelId">Pixel ID</Label>
          <Input
            id="pixelId"
            placeholder="Ex: 123456789012345"
            value={pixelId}
            onChange={(e) => setPixelId(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="accessToken">Access Token — Conversions API</Label>
          <Input
            id="accessToken"
            type="password"
            placeholder="Token de acesso do Pixel"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            required
          />
          <p className="text-xs text-zinc-400">Usado para enviar eventos de conversão ao Facebook.</p>
        </div>

        <div className="border-t border-zinc-100 pt-4 space-y-3">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Meta Ads (Analytics)</p>
          <div className="space-y-1.5">
            <Label htmlFor="adAccountId">ID da Conta de Anúncios</Label>
            <Input
              id="adAccountId"
              placeholder="Ex: act_123456789"
              value={adAccountId}
              onChange={(e) => setAdAccountId(e.target.value)}
            />
            <p className="text-xs text-zinc-400">Encontre em Gerenciador de Anúncios → URL ou coluna ID da conta.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="metaAdsToken">Token de Acesso — Marketing API</Label>
            <Input
              id="metaAdsToken"
              type="password"
              placeholder="Token com permissão ads_read"
              value={metaAdsToken}
              onChange={(e) => setMetaAdsToken(e.target.value)}
            />
            <p className="text-xs text-zinc-400">Token de usuário com permissão <span className="font-mono">ads_read</span>. Gere em developers.facebook.com.</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Salvar Pixel"}
          </Button>
          {pixel && (
            <Button
              type="button"
              variant="outline"
              disabled={testing}
              onClick={async () => {
                setTesting(true);
                const result = await testPixelConnection();
                setTesting(false);
                if (result.success) {
                  toast.success("Pixel funcionando! Evento de teste enviado.");
                } else {
                  toast.error(result.error);
                }
              }}
            >
              {testing ? "Testando..." : "Testar Pixel"}
            </Button>
          )}
        </div>
      </form>

      {/* Campaign Configuration */}
      {pixel && (
        <div className="border-t border-zinc-100 pt-4 space-y-3">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Configuração de Campanha</p>
          <p className="text-xs text-zinc-400">Esses dados são usados para diagnóstico de fase, alertas e recomendações personalizadas.</p>

          <div className="space-y-1.5">
            <Label>Objetivo da Campanha</Label>
            <CustomSelect
              options={OBJECTIVE_OPTIONS}
              value={campaignObjective}
              onChange={setCampaignObjective}
              placeholder="Selecione o objetivo"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Destino de Conversão</Label>
            <CustomSelect
              options={DESTINATION_OPTIONS}
              value={conversionDestination}
              onChange={setConversionDestination}
              placeholder="Selecione o destino"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="monthlyBudget">Verba Mensal (R$)</Label>
            <Input
              id="monthlyBudget"
              type="number"
              placeholder="Ex: 3000"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(e.target.value)}
              min="0"
              step="100"
            />
            <p className="text-xs text-zinc-400">Usado para alertas de orçamento. Deixe vazio se não souber.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Estratégia de Lance</Label>
            <CustomSelect
              options={BID_STRATEGY_OPTIONS}
              value={bidStrategy}
              onChange={setBidStrategy}
              placeholder="Selecione a estratégia"
            />
          </div>

          <Button
            type="button"
            onClick={handleSaveCampaignConfig}
            disabled={savingCampaign}
          >
            {savingCampaign ? "Salvando..." : "Salvar Configuração de Campanha"}
          </Button>
        </div>
      )}
    </div>
  );
}
