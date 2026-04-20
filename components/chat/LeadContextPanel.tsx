"use client";

import { useState, useEffect } from "react";
import {
  X,
  Bot,
  Phone,
  Mail,
  Plus,
  Trash2,
  Clock,
  Pin,
  Archive,
  BellOff,
  BellRing,
  ArchiveRestore,
  PinOff,
} from "lucide-react";
import { LeadScoreBadge } from "@/components/ui/LeadScoreBadge";
import { updateLead, addLeadTag, removeLeadTag, moveLead } from "@/app/actions/leads";
import { toggleAI } from "@/app/actions/messages";
import { getStages } from "@/app/actions/stages";
import type { Stage } from "@/types";
import { toast } from "sonner";

type Props = {
  leadPhone: string;
  onClose: () => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function LeadContextPanel({ leadPhone, onClose }: Props) {
  const [lead, setLead] = useState<any>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState("");
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [movingStage, setMovingStage] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [archived, setArchived] = useState(false);
  const [muted, setMuted] = useState(false);
  const [chatActionBusy, setChatActionBusy] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      import("@/app/actions/leads").then(({ getLeadByPhone }) =>
        getLeadByPhone ? getLeadByPhone(leadPhone) : null
      ),
      getStages(),
    ]).then(([leadData, stagesData]) => {
      if (leadData) {
        setLead(leadData);
        setNotes(leadData.notes || "");
      }
      setStages(stagesData);
      setLoading(false);
    });
  }, [leadPhone]);

  const handleChangeStage = async (newStageId: string) => {
    if (!lead || movingStage || lead.stageId === newStageId) return;
    setMovingStage(true);
    const result = await moveLead(lead.id, newStageId);
    setMovingStage(false);
    if (result.success) {
      const newStage = stages.find((s) => s.id === newStageId);
      setLead({
        ...lead,
        stageId: newStageId,
        stage: newStage ? { name: newStage.name } : lead.stage,
      });
      toast.success(`Movido para ${newStage?.name ?? "nova etapa"}`);
    } else {
      toast.error(result.error ?? "Erro ao mover");
    }
  };

  const toChatId = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    return `${digits}@s.whatsapp.net`;
  };

  const callWhatsAppAction = async (
    action: string,
    body: Record<string, unknown>,
    busyKey: string,
    successMsg: string
  ) => {
    setChatActionBusy(busyKey);
    try {
      const res = await fetch(`/api/whatsapp?action=${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(successMsg);
        return true;
      }
      toast.error(data.error ?? "Erro na ação");
      return false;
    } catch {
      toast.error("Erro de conexão");
      return false;
    } finally {
      setChatActionBusy(null);
    }
  };

  const handleTogglePin = async () => {
    if (!lead) return;
    const ok = await callWhatsAppAction(
      "pin-chat",
      { chatid: toChatId(lead.phone), pin: !pinned },
      "pin",
      !pinned ? "Chat fixado" : "Chat desafixado"
    );
    if (ok) setPinned(!pinned);
  };

  const handleToggleArchive = async () => {
    if (!lead) return;
    const ok = await callWhatsAppAction(
      "archive-chat",
      { chatid: toChatId(lead.phone), archive: !archived },
      "archive",
      !archived ? "Conversa arquivada" : "Conversa desarquivada"
    );
    if (ok) setArchived(!archived);
  };

  const handleToggleMute = async () => {
    if (!lead) return;
    const ok = await callWhatsAppAction(
      "mute-chat",
      { chatid: toChatId(lead.phone), mute: !muted, duration: 28800 },
      "mute",
      !muted ? "Notificações silenciadas por 8h" : "Notificações reativadas"
    );
    if (ok) setMuted(!muted);
  };

  const handleToggleAI = async () => {
    if (!lead) return;
    await toggleAI(lead.id);
    setLead({ ...lead, aiEnabled: !lead.aiEnabled });
    toast.success(lead.aiEnabled ? "IA pausada" : "IA ativada");
  };

  const handleAddTag = async () => {
    if (!lead || !newTag.trim()) return;
    const tag = newTag.trim().toLowerCase();
    await addLeadTag(lead.id, tag);
    setLead({ ...lead, tags: [...lead.tags, tag] });
    setNewTag("");
  };

  const handleRemoveTag = async (tag: string) => {
    if (!lead) return;
    await removeLeadTag(lead.id, tag);
    setLead({ ...lead, tags: lead.tags.filter((t: string) => t !== tag) });
  };

  const handleSaveNotes = async () => {
    if (!lead) return;
    setSavingNotes(true);
    await updateLead(lead.id, { notes });
    setSavingNotes(false);
    toast.success("Notas salvas");
  };

  if (loading) {
    return (
      <div className="w-72 border-l border-slate-200 bg-white p-4 animate-pulse hidden lg:block">
        <div className="h-12 bg-slate-100 rounded-lg mb-3" />
        <div className="h-8 bg-slate-100 rounded-lg mb-3" />
        <div className="h-32 bg-slate-100 rounded-lg" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="w-72 border-l border-slate-200 bg-white p-4 hidden lg:flex flex-col items-center justify-center">
        <p className="text-xs text-slate-400 text-center">Lead nao encontrado no CRM</p>
        <button onClick={onClose} className="mt-2 text-xs text-indigo-600 hover:text-indigo-800">
          Fechar
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 flex-shrink-0 border-l border-slate-200 bg-white flex-col overflow-y-auto hidden lg:flex">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800">Detalhes do Lead</h3>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Quick WhatsApp actions */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-100 bg-slate-50/50">
        <QuickActionButton
          active={pinned}
          loading={chatActionBusy === "pin"}
          onClick={handleTogglePin}
          iconOn={<Pin className="h-3.5 w-3.5" />}
          iconOff={<PinOff className="h-3.5 w-3.5" />}
          label={pinned ? "Fixado" : "Fixar"}
          activeClass="bg-amber-50 text-amber-700"
        />
        <QuickActionButton
          active={archived}
          loading={chatActionBusy === "archive"}
          onClick={handleToggleArchive}
          iconOn={<ArchiveRestore className="h-3.5 w-3.5" />}
          iconOff={<Archive className="h-3.5 w-3.5" />}
          label={archived ? "Arquivado" : "Arquivar"}
          activeClass="bg-slate-100 text-slate-700"
        />
        <QuickActionButton
          active={muted}
          loading={chatActionBusy === "mute"}
          onClick={handleToggleMute}
          iconOn={<BellRing className="h-3.5 w-3.5" />}
          iconOff={<BellOff className="h-3.5 w-3.5" />}
          label={muted ? "Silenciado" : "Silenciar"}
          activeClass="bg-violet-50 text-violet-700"
        />
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* Identity */}
        <div>
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                lead.scoreLabel === "vip"
                  ? "bg-violet-500"
                  : lead.scoreLabel === "quente"
                    ? "bg-rose-500"
                    : lead.scoreLabel === "morno"
                      ? "bg-amber-500"
                      : "bg-slate-400"
              }`}
            >
              {lead.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{lead.name}</p>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Phone className="h-3 w-3" />
                {lead.phone}
              </div>
            </div>
          </div>
          {lead.email && (
            <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
              <Mail className="h-3 w-3" />
              {lead.email}
            </div>
          )}
          <div className="mt-2">
            <LeadScoreBadge score={lead.score} label={lead.scoreLabel} variant="full" />
          </div>
        </div>

        {/* Stage selector (Pipeline change inline) */}
        <div>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
            Etapa do Pipeline
          </p>
          <select
            value={lead.stageId ?? ""}
            onChange={(e) => handleChangeStage(e.target.value)}
            disabled={movingStage || stages.length === 0}
            className="w-full text-sm px-3 py-2 bg-blue-50 text-blue-700 font-medium rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
          >
            {stages.length === 0 && <option value="">Nenhum estágio configurado</option>}
            {stages.map((s) => (
              <option key={s.id} value={s.id} className="bg-white text-slate-700">
                {s.name}
              </option>
            ))}
          </select>
          {movingStage && <p className="text-[10px] text-slate-400 mt-1">Movendo...</p>}
        </div>

        {/* AI Toggle */}
        <div>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
            Assistente IA
          </p>
          <button
            onClick={handleToggleAI}
            className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              lead.aiEnabled
                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            <Bot className="h-4 w-4" />
            {lead.aiEnabled ? "IA ativa" : "IA pausada"}
          </button>
        </div>

        {/* Tags */}
        <div>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
            Tags
          </p>
          <div className="flex flex-wrap gap-1 mb-2">
            {lead.tags.map((tag: string) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-600 text-xs rounded"
              >
                {tag}
                <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-500">
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
              placeholder="Nova tag..."
              className="flex-1 text-xs px-2 py-1 border border-slate-200 rounded outline-none focus:border-indigo-300"
            />
            <button onClick={handleAddTag} className="p-1 text-indigo-600 hover:text-indigo-800">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
            Notas
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleSaveNotes}
            placeholder="Anotacoes sobre este lead..."
            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-300 resize-none h-20"
          />
          {savingNotes && <p className="text-[10px] text-slate-400">Salvando...</p>}
        </div>

        {/* Timeline */}
        {lead.stageHistory.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
              Historico
            </p>
            <div className="space-y-1.5">
              {lead.stageHistory
                .slice(0, 5)
                .map((h: { id: string; stage: { name: string }; createdAt: Date }) => (
                  <div key={h.id} className="flex items-center gap-2 text-xs">
                    <Clock className="h-3 w-3 text-slate-300 shrink-0" />
                    <span className="text-slate-600">{h.stage.name}</span>
                    <span className="text-slate-400 text-[10px] ml-auto">
                      {new Date(h.createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Attribution */}
        {lead.campaign && (
          <div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
              Atribuicao
            </p>
            <div className="text-xs text-slate-500 space-y-0.5">
              {lead.campaign && (
                <p>
                  Campanha: <span className="text-slate-700">{lead.campaign}</span>
                </p>
              )}
              {lead.adSetName && (
                <p>
                  Conjunto: <span className="text-slate-700">{lead.adSetName}</span>
                </p>
              )}
              {lead.adName && (
                <p>
                  Anuncio: <span className="text-slate-700">{lead.adName}</span>
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickActionButton({
  active,
  loading,
  onClick,
  iconOn,
  iconOff,
  label,
  activeClass,
}: {
  active: boolean;
  loading: boolean;
  onClick: () => void;
  iconOn: React.ReactNode;
  iconOff: React.ReactNode;
  label: string;
  activeClass: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title={label}
      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex-1 justify-center ${
        active ? activeClass : "text-slate-500 hover:bg-white hover:text-slate-700"
      }`}
    >
      {active ? iconOn : iconOff}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
