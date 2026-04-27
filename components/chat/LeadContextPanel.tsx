"use client";

import { useState, useEffect } from "react";
import {
  X,
  Bot,
  Phone,
  Mail,
  Clock,
  Pin,
  Archive,
  BellOff,
  BellRing,
  ArchiveRestore,
  PinOff,
  GitBranch,
  ArrowRightLeft,
  MessageCircle,
} from "lucide-react";
import { updateLead, moveLead } from "@/app/actions/leads";
import { toggleAI } from "@/app/actions/messages";
import { getStages } from "@/app/actions/stages";
import { getFunnels, type FunnelData } from "@/app/actions/funnels";
import { getAttendants, assignLeadToAttendant } from "@/app/actions/whatsappHub";
import { toCanonicalRole, ATTENDANT_ROLES } from "@/lib/prospeccao";
import type { Stage } from "@/types";
import { toast } from "sonner";

type Props = {
  leadPhone: string;
  onClose: () => void;
  initialPinned?: boolean;
  initialArchived?: boolean;
  initialMuted?: boolean;
};

type Attendant = { id: string; name: string; role: string };

const SOURCE_LABELS: Record<string, string> = {
  meta: "Meta Ads",
  google: "Google Ads",
  whatsapp: "WhatsApp",
  manual: "Manual",
  outbound: "Outbound",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function LeadContextPanel({
  leadPhone,
  onClose,
  initialPinned = false,
  initialArchived = false,
  initialMuted = false,
}: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [lead, setLead] = useState<any>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [funnels, setFunnels] = useState<FunnelData[]>([]);
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [movingStage, setMovingStage] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [pinned, setPinned] = useState(initialPinned);
  const [archived, setArchived] = useState(initialArchived);
  const [muted, setMuted] = useState(initialMuted);
  const [chatActionBusy, setChatActionBusy] = useState<string | null>(null);

  // Sync pin/archive/mute when props change (parent updated chats list)
  useEffect(() => setPinned(initialPinned), [initialPinned]);
  useEffect(() => setArchived(initialArchived), [initialArchived]);
  useEffect(() => setMuted(initialMuted), [initialMuted]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      import("@/app/actions/leads").then(({ getLeadByPhone }) =>
        getLeadByPhone ? getLeadByPhone(leadPhone) : null
      ),
      getStages(),
      getFunnels(),
      getAttendants(),
    ]).then(([leadData, stagesData, funnelsData, attendantsData]) => {
      if (leadData) {
        setLead(leadData);
        setNotes(leadData.notes || "");
      }
      setStages(stagesData);
      setFunnels(funnelsData);
      setAttendants(attendantsData.map((a) => ({ id: a.id, name: a.name, role: a.role })));
      setLoading(false);
    });
  }, [leadPhone]);

  // Derived: funnel of the current stage
  const currentStage = lead ? stages.find((s) => s.id === lead.stageId) : null;
  const currentFunnelId = currentStage?.funnelId ?? funnels[0]?.id ?? null;
  const stagesOfCurrentFunnel = stages.filter((s) => s.funnelId === currentFunnelId);

  const handleChangeFunnel = async (newFunnelId: string) => {
    if (!lead || movingStage) return;
    // Move lead to the FIRST stage of the new funnel
    const firstStageOfNew = stages
      .filter((s) => s.funnelId === newFunnelId)
      .sort((a, b) => a.order - b.order)[0];
    if (!firstStageOfNew) {
      toast.error("Funil sem etapas configuradas");
      return;
    }
    await handleChangeStage(firstStageOfNew.id);
  };

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
    const next = !pinned;
    const ok = await callWhatsAppAction(
      "pin-chat",
      { chatid: toChatId(lead.phone), pin: next },
      "pin",
      next ? "Chat fixado" : "Chat desafixado"
    );
    if (ok) setPinned(next);
  };

  const handleToggleArchive = async () => {
    if (!lead) return;
    const next = !archived;
    const ok = await callWhatsAppAction(
      "archive-chat",
      { chatid: toChatId(lead.phone), archive: next },
      "archive",
      next ? "Conversa arquivada" : "Conversa desarquivada"
    );
    if (ok) setArchived(next);
  };

  const handleToggleMute = async () => {
    if (!lead) return;
    const next = !muted;
    const ok = await callWhatsAppAction(
      "mute-chat",
      { chatid: toChatId(lead.phone), mute: next, duration: 28800 },
      "mute",
      next ? "Notificações silenciadas por 8h" : "Notificações reativadas"
    );
    if (ok) setMuted(next);
  };

  const handleToggleAI = async () => {
    if (!lead) return;
    await toggleAI(lead.id);
    setLead({ ...lead, aiEnabled: !lead.aiEnabled });
    toast.success(lead.aiEnabled ? "IA pausada" : "IA ativada");
  };

  const handleTransfer = async (newAttendantId: string) => {
    if (!lead || transferring) return;
    setTransferring(true);
    const result = await assignLeadToAttendant(lead.id, newAttendantId || null);
    setTransferring(false);
    if (result.success) {
      setLead({ ...lead, assignedTo: newAttendantId || null });
      const att = attendants.find((a) => a.id === newAttendantId);
      toast.success(att ? `Lead transferido para ${att.name}` : "Atribuição removida");
    } else {
      toast.error(result.error ?? "Erro ao transferir");
    }
  };

  const handleSaveNotes = async () => {
    if (!lead) return;
    setSavingNotes(true);
    await updateLead(lead.id, { notes });
    setSavingNotes(false);
    toast.success("Notas salvas");
  };

  // Below lg, the panel renders as a fixed right-side drawer (slide-in from
  // the right, full-height). At lg+ it's an inline column inside the chat
  // shell — preserving the existing 3-pane desktop layout.
  const drawerClass =
    "fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white border-l border-slate-200 shadow-2xl overflow-y-auto flex flex-col lg:relative lg:w-72 lg:max-w-none lg:flex-shrink-0 lg:shadow-none lg:z-auto";

  if (loading) {
    return (
      <div className={`${drawerClass} animate-pulse p-4`}>
        <div className="h-12 bg-slate-100 rounded-lg mb-3" />
        <div className="h-8 bg-slate-100 rounded-lg mb-3" />
        <div className="h-32 bg-slate-100 rounded-lg" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className={`${drawerClass} items-center justify-center p-4`}>
        <p className="text-xs text-slate-400 text-center">Lead nao encontrado no CRM</p>
        <button onClick={onClose} className="mt-2 text-xs text-indigo-600 hover:text-indigo-800">
          Fechar
        </button>
      </div>
    );
  }

  return (
    <div className={drawerClass}>
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
            <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white bg-indigo-400">
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
        </div>

        {/* Origin */}
        <div>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
            Origem
          </p>
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg text-sm">
            <MessageCircle className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-700">
              {lead.source ? (SOURCE_LABELS[lead.source] ?? lead.source) : "Não rastreada"}
            </span>
            {lead.campaign && (
              <span className="text-[10px] text-slate-400 ml-auto truncate" title={lead.campaign}>
                {lead.campaign}
              </span>
            )}
          </div>
        </div>

        {/* Funnel selector */}
        {funnels.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <GitBranch className="h-3 w-3" /> Funil
            </p>
            <select
              value={currentFunnelId ?? ""}
              onChange={(e) => handleChangeFunnel(e.target.value)}
              disabled={movingStage}
              className="w-full text-sm px-3 py-2 bg-violet-50 text-violet-700 font-medium rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {funnels.map((f) => (
                <option key={f.id} value={f.id} className="bg-white text-slate-700">
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Stage selector — only stages of current funnel */}
        <div>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
            Etapa do Pipeline
          </p>
          <select
            value={lead.stageId ?? ""}
            onChange={(e) => handleChangeStage(e.target.value)}
            disabled={movingStage || stagesOfCurrentFunnel.length === 0}
            className="w-full text-sm px-3 py-2 bg-blue-50 text-blue-700 font-medium rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {stagesOfCurrentFunnel.length === 0 && <option value="">Sem etapas neste funil</option>}
            {stagesOfCurrentFunnel.map((s) => (
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

        {/* Transfer to vendor */}
        {attendants.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <ArrowRightLeft className="h-3 w-3" /> Transferir para
            </p>
            <select
              value={lead.assignedTo ?? ""}
              onChange={(e) => handleTransfer(e.target.value)}
              disabled={transferring}
              className="w-full text-sm px-3 py-2 bg-slate-50 text-slate-700 rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <option value="">— Sem responsavel —</option>
              {attendants.map((a) => {
                const role = toCanonicalRole(a.role);
                const label = ATTENDANT_ROLES.find((r) => r.value === role)?.label ?? role;
                return (
                  <option key={a.id} value={a.id} className="bg-white text-slate-700">
                    {a.name} · {label}
                  </option>
                );
              })}
            </select>
            {transferring && <p className="text-[10px] text-slate-400 mt-1">Transferindo...</p>}
          </div>
        )}

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
