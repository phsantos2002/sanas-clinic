"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveWhatsAppConfig } from "@/app/actions/whatsapp";
import { toast } from "sonner";

type WhatsAppConfig = {
  phoneNumberId: string;
  accessToken: string;
  verifyToken: string;
} | null;

type Props = {
  config: WhatsAppConfig;
};

export function WhatsAppConfigForm({ config }: Props) {
  const [phoneNumberId, setPhoneNumberId] = useState(config?.phoneNumberId ?? "");
  const [accessToken, setAccessToken] = useState(config?.accessToken ?? "");
  const [verifyToken, setVerifyToken] = useState(config?.verifyToken ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneNumberId.trim() || !accessToken.trim() || !verifyToken.trim()) return;
    setLoading(true);
    const result = await saveWhatsAppConfig(phoneNumberId, accessToken, verifyToken);
    setLoading(false);
    if (result.success) {
      toast.success("Configurações do WhatsApp salvas");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div className="space-y-1.5">
        <Label htmlFor="phoneNumberId">Phone Number ID</Label>
        <Input
          id="phoneNumberId"
          placeholder="Ex: 123456789012345"
          value={phoneNumberId}
          onChange={(e) => setPhoneNumberId(e.target.value)}
          required
        />
        <p className="text-xs text-zinc-400">
          Encontre em Meta Developers → WhatsApp → Configuração da API → Phone Number ID.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="whatsappToken">Access Token</Label>
        <Input
          id="whatsappToken"
          type="password"
          placeholder="Token de acesso permanente"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          required
        />
        <p className="text-xs text-zinc-400">
          Token com permissão <span className="font-mono">whatsapp_business_messaging</span>. Gere em Meta Developers → WhatsApp.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="verifyToken">Verify Token</Label>
        <Input
          id="verifyToken"
          placeholder="Crie uma senha secreta qualquer"
          value={verifyToken}
          onChange={(e) => setVerifyToken(e.target.value)}
          required
        />
        <p className="text-xs text-zinc-400">
          Você define este valor e usa o mesmo ao configurar o webhook na Meta.
        </p>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Salvando..." : "Salvar WhatsApp"}
      </Button>
    </form>
  );
}
