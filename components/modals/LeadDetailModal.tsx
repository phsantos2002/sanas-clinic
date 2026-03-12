"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Phone,
  MessageCircle,
  Clock,
  Target,
  Zap,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { getLeadDetail } from "@/app/actions/leads";
import type { LeadDetail } from "@/types";

type Props = {
  leadId: string | null;
  onClose: () => void;
};

const platformLabels: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  google: "Google",
  whatsapp: "WhatsApp",
};

const sourceLabels: Record<string, string> = {
  meta: "Meta Ads",
  google: "Google Ads",
  whatsapp: "WhatsApp Direto",
  manual: "Cadastro Manual",
};

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between py-2 border-b border-zinc-100 last:border-0">
      <span className="text-xs text-zinc-500 min-w-[140px]">{label}</span>
      <span className="text-xs font-medium text-black text-right">{value}</span>
    </div>
  );
}

export function LeadDetailModal({ leadId, onClose }: Props) {
  const router = useRouter();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!leadId) {
      setLead(null);
      return;
    }
    setLoading(true);
    getLeadDetail(leadId).then((data) => {
      setLead(data);
      setLoading(false);
    });
  }, [leadId]);

  function formatDate(date: Date) {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const firstMessage = lead?.messages?.length
    ? lead.messages[lead.messages.length - 1]
    : null;
  const lastMessage = lead?.messages?.length ? lead.messages[0] : null;
  const lastStageChange = lead?.stageHistory?.length
    ? lead.stageHistory[lead.stageHistory.length - 1]
    : null;

  return (
    <Dialog open={!!leadId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Lead</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="py-8 text-center text-sm text-zinc-400">Carregando...</div>
        )}

        {!loading && lead && (
          <div className="space-y-5">
            {/* Section 1: Informações da Conversa */}
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-black flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                Informações da Conversa
              </h4>
              <div className="bg-zinc-50 rounded-lg p-3">
                <InfoRow label="WhatsApp" value={lead.phone} />
                <InfoRow label="Nome" value={lead.name} />
                <InfoRow
                  label="Origem"
                  value={lead.source ? (sourceLabels[lead.source] ?? lead.source) : "Não rastreada"}
                />
                <InfoRow
                  label="Etapa da Jornada"
                  value={lead.stage?.name ?? "Sem estágio"}
                />
                <InfoRow
                  label="Primeira Mensagem"
                  value={firstMessage ? formatDate(firstMessage.createdAt) : "—"}
                />
                <InfoRow
                  label="Última Mensagem"
                  value={lastMessage ? formatDate(lastMessage.createdAt) : "—"}
                />
                <InfoRow
                  label="Última Mudança de Etapa"
                  value={lastStageChange ? formatDate(lastStageChange.createdAt) : "—"}
                />
                <InfoRow
                  label="IA"
                  value={lead.aiEnabled ? "Ativada" : "Desativada"}
                />
                <InfoRow label="Criado em" value={formatDate(lead.createdAt)} />
              </div>
            </div>

            {lead.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {lead.tags.map(({ tag }) => (
                  <Badge key={tag.id} variant="secondary" className="text-xs py-0 h-5">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}

            <Separator />

            {/* Section 2: Informações do Método de Rastreamento */}
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-black flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                Informações do Método de Rastreamento
              </h4>
              {!lead.source || (lead.source !== "meta" && lead.source !== "google") ? (
                <p className="text-xs text-zinc-400 py-2">
                  {lead.source === "whatsapp"
                    ? "Lead chegou diretamente pelo WhatsApp, sem dados de campanha."
                    : lead.source === "manual"
                    ? "Lead cadastrado manualmente."
                    : "Nenhuma informação de rastreamento disponível."}
                </p>
              ) : (
                <div className="bg-zinc-50 rounded-lg p-3">
                  <InfoRow
                    label="Método de Rastreamento"
                    value={
                      lead.source === "meta"
                        ? "Campanha do Meta Ads"
                        : "Campanha do Google Ads"
                    }
                  />
                  <InfoRow label="Plataforma" value={lead.platform ? (platformLabels[lead.platform] ?? lead.platform) : null} />
                  <InfoRow label="Conta de Anúncio" value={lead.adAccountName} />
                  <InfoRow label="Nome da Campanha" value={lead.campaign} />
                  <InfoRow label="Conjunto de Anúncios" value={lead.adSetName} />
                  <InfoRow label="Nome do Anúncio" value={lead.adName} />
                  <InfoRow label="Meio" value={lead.medium} />
                  <InfoRow label="Referrer" value={lead.referrer} />
                </div>
              )}
            </div>

            <Separator />

            {/* Section 3: Disparos de Pixel */}
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-black flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                Disparos de Pixel
              </h4>
              {!lead.pixelEvents || lead.pixelEvents.length === 0 ? (
                <p className="text-xs text-zinc-400 py-2">Nenhum disparo de pixel registrado.</p>
              ) : (
                <div className="bg-zinc-50 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[1fr_80px_90px_60px] gap-1 px-3 py-1.5 bg-zinc-100 text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
                    <span>Data</span>
                    <span>Etapa</span>
                    <span>Evento</span>
                    <span>Status</span>
                  </div>
                  {lead.pixelEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="grid grid-cols-[1fr_80px_90px_60px] gap-1 px-3 py-1.5 text-xs border-b border-zinc-100 last:border-0"
                    >
                      <span className="text-zinc-600">{formatDate(evt.createdAt)}</span>
                      <span className="text-zinc-700 truncate">{evt.stageName}</span>
                      <Badge variant="secondary" className="text-[10px] py-0 h-4 w-fit">
                        {evt.eventName}
                      </Badge>
                      {evt.success ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Section 4: Histórico de Estágios */}
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-black flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Histórico de Estágios
              </h4>
              {lead.stageHistory.length === 0 ? (
                <p className="text-xs text-zinc-400 py-2">Nenhuma movimentação registrada.</p>
              ) : (
                <div className="space-y-1">
                  {lead.stageHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between text-xs py-1"
                    >
                      <Badge variant="secondary" className="text-xs py-0 h-5">
                        {entry.stage.name}
                      </Badge>
                      <span className="text-zinc-400">{formatDate(entry.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Section 5: Últimas Mensagens */}
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-black flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5" />
                Últimas Mensagens ({lead.messages.length})
              </h4>
              {lead.messages.length === 0 ? (
                <p className="text-xs text-zinc-400 py-2">Nenhuma mensagem.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {lead.messages
                    .slice()
                    .reverse()
                    .slice(0, 10)
                    .map((msg) => (
                      <div
                        key={msg.id}
                        className={`text-xs p-2 rounded-md ${
                          msg.role === "user"
                            ? "bg-zinc-100 text-zinc-700"
                            : "bg-black/5 text-zinc-600"
                        }`}
                      >
                        <div className="flex justify-between mb-0.5">
                          <span className="font-medium">
                            {msg.role === "user" ? lead.name : "IA"}
                          </span>
                          <span className="text-zinc-400">{formatDate(msg.createdAt)}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => {
                  onClose();
                  router.push(`/dashboard/chat?leadId=${lead.id}`);
                }}
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                Abrir Chat
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
