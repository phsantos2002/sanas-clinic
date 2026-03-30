"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, ArrowLeft, ThumbsUp, ThumbsDown, Clock } from "lucide-react";
import { toast } from "sonner";
import { sendAgentMessage, setAgentFeedback, type AgentChatData } from "@/app/actions/aiAgents";

type AgentDef = { type: string; name: string; emoji: string; description: string };

const AGENT_COLORS: Record<string, string> = {
  strategist: "from-blue-500 to-indigo-600",
  creative: "from-pink-500 to-rose-600",
  commercial: "from-amber-500 to-orange-600",
  analyst: "from-emerald-500 to-teal-600",
  retention: "from-violet-500 to-purple-600",
};

export function AgentsClient({ agents, recentChats }: { agents: AgentDef[]; recentChats: AgentChatData[] }) {
  const [selectedAgent, setSelectedAgent] = useState<AgentDef | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSelectAgent = (agent: AgentDef) => {
    setSelectedAgent(agent);
    setChatId(null);
    setMessages([]);
  };

  const handleLoadChat = (chat: AgentChatData) => {
    const agent = agents.find((a) => a.type === chat.agentType);
    if (agent) setSelectedAgent(agent);
    setChatId(chat.id);
    setMessages(chat.messages.map((m) => ({ role: m.role, content: m.content })));
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedAgent || sending) return;
    const msg = input.trim();
    setInput("");
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", content: msg }]);

    const result = await sendAgentMessage(selectedAgent.type, msg, chatId || undefined);
    setSending(false);

    if (result.success && result.data) {
      setChatId(result.data.chatId);
      setMessages((prev) => [...prev, { role: "assistant", content: result.data!.reply }]);
    } else {
      toast.error(result.success ? "Erro" : result.error);
    }
  };

  const handleFeedback = async (feedback: "approved" | "rejected") => {
    if (!chatId) return;
    await setAgentFeedback(chatId, feedback);
    toast.success(feedback === "approved" ? "Resposta aprovada!" : "Feedback registrado");
  };

  // Agent selection view
  if (!selectedAgent) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">Agentes de IA</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Consultores especializados com acesso aos seus dados reais</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <button
              key={agent.type}
              onClick={() => handleSelectAgent(agent)}
              className="bg-white border border-slate-100 rounded-2xl p-5 text-left hover:shadow-md hover:border-slate-200 transition-all group"
            >
              <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${AGENT_COLORS[agent.type] || "from-slate-400 to-slate-600"} flex items-center justify-center text-2xl mb-3`}>
                {agent.emoji}
              </div>
              <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{agent.name}</h3>
              <p className="text-xs text-slate-400 mt-1">{agent.description}</p>
            </button>
          ))}
        </div>

        {/* Recent chats */}
        {recentChats.length > 0 && (
          <div>
            <h2 className="font-semibold text-slate-900 text-sm mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" /> Conversas Recentes
            </h2>
            <div className="space-y-2">
              {recentChats.slice(0, 8).map((chat) => {
                const agent = agents.find((a) => a.type === chat.agentType);
                return (
                  <button
                    key={chat.id}
                    onClick={() => handleLoadChat(chat)}
                    className="w-full bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-lg">{agent?.emoji || "🤖"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{chat.title}</p>
                      <p className="text-xs text-slate-400">{agent?.name} — {new Date(chat.createdAt).toLocaleDateString("pt-BR")}</p>
                    </div>
                    {chat.feedback && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        chat.feedback === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {chat.feedback === "approved" ? "Aprovado" : "Rejeitado"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Chat view
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => setSelectedAgent(null)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
          <ArrowLeft className="h-4 w-4 text-slate-500" />
        </button>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${AGENT_COLORS[selectedAgent.type] || "from-slate-400 to-slate-600"} flex items-center justify-center text-lg`}>
          {selectedAgent.emoji}
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">{selectedAgent.name}</h2>
          <p className="text-xs text-slate-400">{selectedAgent.description}</p>
        </div>
      </div>

      {/* Chat */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        <div className="h-[500px] overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <span className="text-4xl">{selectedAgent.emoji}</span>
              <p className="text-sm text-slate-500 mt-3">Ola! Sou o {selectedAgent.name}.</p>
              <p className="text-xs text-slate-400 mt-1">{selectedAgent.description}</p>
              <p className="text-xs text-slate-400 mt-3">Pergunte qualquer coisa sobre seu negocio.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-800"
              }`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-slate-100 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Feedback */}
        {messages.length > 1 && chatId && (
          <div className="border-t border-slate-100 px-4 py-2 flex items-center gap-2">
            <span className="text-xs text-slate-400">A resposta foi util?</span>
            <button onClick={() => handleFeedback("approved")} className="h-7 w-7 rounded-lg hover:bg-green-50 flex items-center justify-center">
              <ThumbsUp className="h-3.5 w-3.5 text-slate-400 hover:text-green-600" />
            </button>
            <button onClick={() => handleFeedback("rejected")} className="h-7 w-7 rounded-lg hover:bg-red-50 flex items-center justify-center">
              <ThumbsDown className="h-3.5 w-3.5 text-slate-400 hover:text-red-600" />
            </button>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-slate-100 p-3 flex gap-2">
          <input
            type="text" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={`Pergunte ao ${selectedAgent.name}...`}
            className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={sending}
          />
          <button onClick={handleSend} disabled={sending || !input.trim()}
            className="h-10 w-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
