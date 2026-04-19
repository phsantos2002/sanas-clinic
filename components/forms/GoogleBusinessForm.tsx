"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveGoogleBusinessConfig } from "@/app/actions/googleBusiness";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";

type Props = {
  config: {
    apiKey: string;
    placeId: string;
    whatsappMsg: string | null;
  } | null;
};

export function GoogleBusinessForm({ config }: Props) {
  const [apiKey, setApiKey] = useState(config?.apiKey ?? "");
  const [placeId, setPlaceId] = useState(config?.placeId ?? "");
  const [whatsappMsg, setWhatsappMsg] = useState(
    config?.whatsappMsg ?? "Olá! Vi vocês no Google e gostaria de saber mais."
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey.trim() || !placeId.trim()) return;
    setLoading(true);
    const result = await saveGoogleBusinessConfig({
      apiKey: apiKey.trim(),
      placeId: placeId.trim(),
      whatsappMsg: whatsappMsg.trim() || undefined,
    });
    setLoading(false);
    if (result.success) {
      toast.success("Google Meu Negócio configurado");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div className="space-y-1.5">
        <Label htmlFor="gbApiKey">API Key do Google Cloud</Label>
        <Input
          id="gbApiKey"
          type="password"
          placeholder="AIzaSy..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          required
        />
        <p className="text-xs text-zinc-400">
          Crie em{" "}
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-500 hover:underline inline-flex items-center gap-0.5"
          >
            Google Cloud Console <ExternalLink className="h-2.5 w-2.5" />
          </a>{" "}
          com a <strong>Places API (New)</strong> ativada.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="gbPlaceId">Place ID</Label>
        <Input
          id="gbPlaceId"
          placeholder="ChIJ..."
          value={placeId}
          onChange={(e) => setPlaceId(e.target.value)}
          required
        />
        <p className="text-xs text-zinc-400">
          Encontre seu Place ID em{" "}
          <a
            href="https://developers.google.com/maps/documentation/places/web-service/place-id"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-500 hover:underline inline-flex items-center gap-0.5"
          >
            Place ID Finder <ExternalLink className="h-2.5 w-2.5" />
          </a>{" "}
          buscando o nome do seu negócio.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="gbWhatsappMsg">Mensagem padrão do WhatsApp</Label>
        <Input
          id="gbWhatsappMsg"
          placeholder="Olá! Vi vocês no Google..."
          value={whatsappMsg}
          onChange={(e) => setWhatsappMsg(e.target.value)}
        />
        <p className="text-xs text-zinc-400">
          Mensagem pré-preenchida quando o cliente clica no botão WhatsApp do Google.
        </p>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Salvando..." : "Salvar Google Meu Negócio"}
      </Button>
    </form>
  );
}
