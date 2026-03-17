"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { savePixel, testPixelConnection } from "@/app/actions/pixel";
import { toast } from "sonner";
import type { Pixel } from "@/types";

type Props = {
  pixel: Pixel | null;
};

export function FacebookPixelForm({ pixel }: Props) {
  const [pixelId, setPixelId] = useState(pixel?.pixelId ?? "");
  const [accessToken, setAccessToken] = useState(pixel?.accessToken ?? "");
  const [adAccountId, setAdAccountId] = useState(pixel?.adAccountId ?? "");
  const [metaAdsToken, setMetaAdsToken] = useState(pixel?.metaAdsToken ?? "");
  const [loading, setLoading] = useState(false);
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

      {pixel && (
        <div className="border-t border-zinc-100 pt-4">
          <p className="text-xs text-zinc-400">
            As configurações de campanha (objetivo, estratégia de lance, segmento, etc.) agora são feitas
            individualmente em cada campanha na <span className="font-medium text-indigo-600">aba Meta Ads</span>.
          </p>
        </div>
      )}
    </div>
  );
}
