"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  CheckCheck,
  Clock,
  Inbox,
  Loader2,
  MessageCircle,
  Send,
  StickyNote,
  User,
  UserCheck,
  ArrowRightLeft,
} from "lucide-react";
import { toast } from "sonner";
import {
  listTickets,
  getTicketCounts,
  getTicketConversation,
  acceptTicketAction,
  resolveTicketAction,
  transferTicketAction,
  sendTicketMessage,
  scheduleTicketMessage,
  type TicketListItem,
  type TicketStatus,
  type TicketConversation,
} from "@/app/actions/tickets";
import { trackTemplateUsage } from "@/app/actions/whatsappHub";
import type { AttendantData, TemplateData } from "@/app/actions/whatsappHub";

type Props = {
  initialTickets: TicketListItem[];
  initialCounts: Record<TicketStatus, number>;
  attendants: AttendantData[];
  templates: TemplateData[];
};

const TABS: { key: TicketStatus; label: string; icon: typeof Inbox }[] = [
  { key: "pending", label: "Fila", icon: Inbox },
  { key: "open", label: "Abertos", icon: UserCheck },
  { key: "bot", label: "IA", icon: Bot },
  { key: "resolved", label: "Resolvidos", icon: CheckCheck },
];

function timeAgo(date: Date | string | null): string {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function AtendimentosClient({ initialTickets, initialCounts, attendants, templates }: Props) {
  const [tab, setTab] = useState<TicketStatus>("pending");
  const [tickets, setTickets] = useState<TicketListItem[]>(initialTickets);
  const [counts, setCounts] = useState(initialCounts);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<TicketConversation | null>(null);
  const [composer, setComposer] = useState("");
  const [isNote, setIsNote] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Quick replies: "/" no início do texto abre o picker filtrado pelo atalho
  const slashQuery = composer.startsWith("/") ? composer.slice(1).toLowerCase() : null;
  const matchingTemplates =
    slashQuery !== null
      ? templates
          .filter(
            (t) =>
              (t.shortcut ?? "").toLowerCase().replace(/^\//, "").startsWith(slashQuery) ||
              t.name.toLowerCase().includes(slashQuery)
          )
          .slice(0, 6)
      : [];

  const applyTemplate = (t: TemplateData) => {
    const leadFirstName = conversation?.lead.name.split(" ")[0] ?? "";
    setComposer(t.content.replace(/\{\{nome\}\}/gi, leadFirstName));
    trackTemplateUsage(t.id).catch(() => {});
  };

  const refreshList = useCallback(
    async (activeTab: TicketStatus, showSpinner = false) => {
      if (showSpinner) setLoadingList(true);
      const [list, newCounts] = await Promise.all([listTickets(activeTab), getTicketCounts()]);
      setTickets(list);
      setCounts(newCounts);
      if (showSpinner) setLoadingList(false);
    },
    []
  );

  const refreshConversation = useCallback(async (ticketId: string) => {
    const conv = await getTicketConversation(ticketId);
    setConversation(conv);
  }, []);

  // Troca de tab
  useEffect(() => {
    refreshList(tab, true);
  }, [tab, refreshList]);

  // Polling: lista a cada 8s, conversa aberta a cada 5s
  useEffect(() => {
    const interval = setInterval(() => refreshList(tab), 8000);
    return () => clearInterval(interval);
  }, [tab, refreshList]);

  useEffect(() => {
    if (!selectedId) return;
    refreshConversation(selectedId);
    const interval = setInterval(() => refreshConversation(selectedId), 5000);
    return () => clearInterval(interval);
  }, [selectedId, refreshConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages.length]);

  const handleAccept = async (ticketId: string) => {
    const result = await acceptTicketAction(ticketId);
    if (!result.success) toast.error(result.error);
    else {
      toast.success("Atendimento aceito!");
      setTab("open");
      setSelectedId(ticketId);
    }
  };

  const handleResolve = async (ticketId: string) => {
    const result = await resolveTicketAction(ticketId);
    if (!result.success) toast.error(result.error);
    else {
      toast.success("Atendimento resolvido");
      setConversation(null);
      setSelectedId(null);
      refreshList(tab, true);
    }
  };

  const handleTransfer = async (attendantId: string) => {
    if (!selectedId) return;
    const result = await transferTicketAction(selectedId, { attendantId });
    setShowTransfer(false);
    if (!result.success) toast.error(result.error);
    else {
      toast.success("Transferido");
      refreshList(tab, true);
      refreshConversation(selectedId);
    }
  };

  const handleSend = async () => {
    if (!selectedId || !composer.trim() || sending) return;
    setSending(true);
    const result = await sendTicketMessage(selectedId, composer, { isNote });
    setSending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setComposer("");
    refreshConversation(selectedId);
  };

  const handleSchedule = async () => {
    if (!selectedId || !composer.trim() || !scheduleAt) return;
    const result = await scheduleTicketMessage(
      selectedId,
      composer,
      new Date(scheduleAt).toISOString()
    );
    setShowSchedule(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Mensagem agendada!");
    setComposer("");
    setScheduleAt("");
  };

  return (
    <div className="flex gap-3 h-[calc(100vh-180px)] min-h-[480px]">
      {/* ── Lista ── */}
      <div className="w-80 shrink-0 bg-white border border-slate-100 rounded-2xl flex flex-col overflow-hidden">
        <div className="flex items-center gap-0.5 p-1.5 border-b border-slate-50">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === t.key ? "bg-indigo-50 text-indigo-700" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">{t.label}</span>
              {counts[t.key] > 0 && (
                <span
                  className={`text-[10px] px-1.5 rounded-full ${
                    t.key === "pending" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {counts[t.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 text-slate-300 animate-spin" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-10 px-4">
              <Inbox className="h-7 w-7 text-slate-200 mx-auto mb-2" />
              <p className="text-xs text-slate-400">
                {tab === "pending"
                  ? "Fila vazia — a IA esta dando conta 😉"
                  : "Nenhum atendimento aqui"}
              </p>
            </div>
          ) : (
            tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`w-full text-left px-3 py-2.5 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                  selectedId === t.id ? "bg-indigo-50/50" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                    {t.leadName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{t.leadName}</p>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {timeAgo(t.lastInboundAt ?? t.openedAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">{t.lastMessage ?? t.leadPhone}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {t.queueName && (
                        <span
                          className="text-[9px] px-1.5 py-px rounded-full text-white"
                          style={{ backgroundColor: t.queueColor ?? "#3b82f6" }}
                        >
                          {t.queueName}
                        </span>
                      )}
                      {t.attendantName && (
                        <span className="text-[9px] px-1.5 py-px rounded-full bg-sky-50 text-sky-700">
                          {t.attendantName.split(" ")[0]}
                        </span>
                      )}
                    </div>
                  </div>
                  {tab === "pending" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAccept(t.id);
                      }}
                      className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-2 py-1 rounded-lg shrink-0"
                    >
                      Aceitar
                    </button>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Conversa ── */}
      <div className="flex-1 bg-white border border-slate-100 rounded-2xl flex flex-col overflow-hidden">
        {!conversation ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-300">
            <MessageCircle className="h-10 w-10" />
            <p className="text-sm">Selecione um atendimento</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-50">
              <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500">
                {conversation.lead.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {conversation.lead.name}
                </p>
                <p className="text-xs text-slate-400">
                  {conversation.lead.phone}
                  {conversation.ticket.queueName ? ` · ${conversation.ticket.queueName}` : ""}
                </p>
              </div>
              {conversation.ticket.status === "pending" && (
                <button
                  onClick={() => handleAccept(conversation.ticket.id)}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-1.5 rounded-xl"
                >
                  <UserCheck className="h-3.5 w-3.5" /> Aceitar
                </button>
              )}
              {(conversation.ticket.status === "open" || conversation.ticket.status === "bot") && (
                <>
                  <div className="relative">
                    <button
                      onClick={() => setShowTransfer((v) => !v)}
                      className="flex items-center gap-1.5 border border-slate-200 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-xl hover:bg-slate-50"
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" /> Transferir
                    </button>
                    {showTransfer && (
                      <div className="absolute right-0 top-9 z-20 bg-white border border-slate-100 rounded-xl shadow-lg p-1 w-44">
                        {attendants
                          .filter((a) => a.isActive)
                          .map((a) => (
                            <button
                              key={a.id}
                              onClick={() => handleTransfer(a.id)}
                              className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-1.5"
                            >
                              <User className="h-3 w-3 text-slate-400" /> {a.name}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleResolve(conversation.ticket.id)}
                    className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1.5 rounded-xl"
                  >
                    <CheckCheck className="h-3.5 w-3.5" /> Resolver
                  </button>
                </>
              )}
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-slate-50/40">
              {conversation.messages.map((m) => {
                const isLead = m.role === "user";
                const isNoteMsg = m.role === "note";
                return (
                  <div key={m.id} className={`flex ${isLead ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
                        isNoteMsg
                          ? "bg-amber-100 text-amber-900 border border-amber-200"
                          : isLead
                            ? "bg-white text-slate-800 border border-slate-100"
                            : "bg-indigo-600 text-white"
                      }`}
                    >
                      {isNoteMsg && (
                        <p className="text-[10px] font-semibold flex items-center gap-1 mb-0.5">
                          <StickyNote className="h-3 w-3" /> Nota interna
                        </p>
                      )}
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      <p
                        className={`text-[9px] mt-0.5 ${
                          isNoteMsg
                            ? "text-amber-600"
                            : isLead
                              ? "text-slate-300"
                              : "text-indigo-200"
                        }`}
                      >
                        {new Date(m.createdAt).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <div className="border-t border-slate-50 p-3 space-y-1.5 relative">
              {/* Quick replies picker */}
              {matchingTemplates.length > 0 && (
                <div className="absolute bottom-full left-3 right-3 mb-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-20">
                  <p className="text-[10px] text-slate-400 px-3 pt-2">Respostas rapidas</p>
                  {matchingTemplates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => applyTemplate(t)}
                      className="w-full text-left px-3 py-2 hover:bg-indigo-50 transition-colors"
                    >
                      <span className="text-xs font-semibold text-indigo-600">
                        {t.shortcut ?? `/${t.name}`}
                      </span>
                      <span className="text-xs text-slate-500 ml-2 line-clamp-1">
                        {t.content.slice(0, 70)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsNote((v) => !v)}
                  className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg transition-colors ${
                    isNote
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  <StickyNote className="h-3 w-3" />
                  {isNote ? "Nota interna (nao envia)" : "Nota"}
                </button>
                <button
                  onClick={() => setShowSchedule(true)}
                  disabled={!composer.trim() || isNote}
                  className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-40"
                  title="Agendar envio desta mensagem"
                >
                  <Clock className="h-3 w-3" /> Agendar
                </button>
                {templates.length > 0 && !composer && (
                  <span className="text-[10px] text-slate-300 ml-auto">
                    Digite / para respostas rapidas
                  </span>
                )}
              </div>
              <div className="flex items-end gap-2">
                <textarea
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={isNote ? "Escreva uma nota para a equipe..." : "Digite sua mensagem..."}
                  rows={2}
                  className={`flex-1 border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 ${
                    isNote
                      ? "border-amber-200 bg-amber-50/50 focus:ring-amber-400"
                      : "border-slate-200 focus:ring-indigo-500"
                  }`}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !composer.trim()}
                  className={`p-2.5 rounded-xl text-white disabled:opacity-40 ${
                    isNote ? "bg-amber-500 hover:bg-amber-600" : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal de agendamento */}
      {showSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-3">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-500" /> Agendar mensagem
            </h3>
            <p className="text-xs text-slate-400 line-clamp-2 bg-slate-50 rounded-lg p-2">
              {composer}
            </p>
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[10px] text-slate-400">
              O envio acontece no proximo ciclo do despachante apos o horario.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSchedule(false)}
                className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2 rounded-xl hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSchedule}
                disabled={!scheduleAt}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-xl"
              >
                Agendar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
