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
  Globe,
  Megaphone,
  Monitor,
  Clock,
  Bot,
  ExternalLink,
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
            {/* Basic Info */}
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-black">{lead.name}</h3>
              <div className="flex items-center gap-2 text-sm text-zinc-600">
                <Phone className="h-3.5 w-3.5" />
                <span>{lead.phone}</span>
              </div>
              {lead.stage && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">Estágio:</span>
                  <Badge variant="secondary">{lead.stage.name}</Badge>
                </div>
              )}
              {lead.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {lead.tags.map(({ tag }) => (
                    <Badge key={tag.id} variant="secondary" className="text-xs py-0 h-5">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Clock className="h-3 w-3" />
                <span>Criado em {formatDate(lead.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Bot className="h-3 w-3" />
                <span>IA {lead.aiEnabled ? "ativada" : "desativada"}</span>
              </div>
            </div>

            <Separator />

            {/* Attribution / Origin */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-black">Origem do Lead</h4>
              {!lead.source && !lead.platform && !lead.campaign ? (
                <p className="text-xs text-zinc-400">
                  Nenhuma informação de origem disponível. Leads via WhatsApp ou cadastro manual não possuem dados de campanha.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {lead.source && (
                    <div className="space-y-0.5">
                      <span className="text-xs text-zinc-400 flex items-center gap-1">
                        <Globe className="h-3 w-3" /> Fonte
                      </span>
                      <p className="text-sm font-medium">{sourceLabels[lead.source] ?? lead.source}</p>
                    </div>
                  )}
                  {lead.platform && (
                    <div className="space-y-0.5">
                      <span className="text-xs text-zinc-400 flex items-center gap-1">
                        <Monitor className="h-3 w-3" /> Plataforma
                      </span>
                      <p className="text-sm font-medium">{platformLabels[lead.platform] ?? lead.platform}</p>
                    </div>
                  )}
                  {lead.campaign && (
                    <div className="space-y-0.5">
                      <span className="text-xs text-zinc-400 flex items-center gap-1">
                        <Megaphone className="h-3 w-3" /> Campanha
                      </span>
                      <p className="text-sm font-medium">{lead.campaign}</p>
                    </div>
                  )}
                  {lead.adName && (
                    <div className="space-y-0.5">
                      <span className="text-xs text-zinc-400">Anúncio</span>
                      <p className="text-sm font-medium">{lead.adName}</p>
                    </div>
                  )}
                  {lead.medium && (
                    <div className="space-y-0.5">
                      <span className="text-xs text-zinc-400">Meio</span>
                      <p className="text-sm font-medium">{lead.medium}</p>
                    </div>
                  )}
                  {lead.referrer && (
                    <div className="col-span-2 space-y-0.5">
                      <span className="text-xs text-zinc-400 flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> Referrer
                      </span>
                      <p className="text-sm font-medium truncate">{lead.referrer}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Stage History */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-black">Histórico de Estágios</h4>
              {lead.stageHistory.length === 0 ? (
                <p className="text-xs text-zinc-400">Nenhuma movimentação registrada.</p>
              ) : (
                <div className="space-y-1.5">
                  {lead.stageHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between text-xs"
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

            {/* Recent Messages */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-black">
                Últimas Mensagens ({lead.messages.length})
              </h4>
              {lead.messages.length === 0 ? (
                <p className="text-xs text-zinc-400">Nenhuma mensagem.</p>
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
