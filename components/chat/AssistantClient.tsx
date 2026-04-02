"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, Sparkles, BarChart3, Users, Megaphone, PenTool, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Message = { role: "user" | "assistant"; content: string };

const QUICK_ACTIONS = [
  { label: "Como estao meus ads?", icon: BarChart3 },
  { label: "Quantos leads entraram hoje?", icon: Users },
  { label: "Resumo da semana", icon: Sparkles },
  { label: "Gera um Reels sobre botox", icon: PenTool },
  { label: "Quais leads estao parados?", icon: Users },
  { label: "Me da ideias pro Instagram", icon: PenTool },
];

export function AssistantClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || sending) return;
    setInput("");
    setSending(true);

    const newMessages: Message[] = [...messages, { role: "user", content: msg }];
    setMessages(newMessages);

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          history: newMessages.slice(-10),
        }),
      });

      const data = await res.json();
      if (res.ok && data.reply) {
        setMessages([...newMessages, { role: "assistant", content: data.reply }]);
      } else {
        toast.error(data.error || "Erro no assistente");
      }
    } catch {
      toast.error("Erro de conexao");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        {/* Messages */}
        <div className="h-[calc(100vh-280px)] min-h-[400px] overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="h-16 w-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <h2 className="font-bold text-slate-900 text-lg">Assistente Sanas Pulse</h2>
              <p className="text-sm text-slate-400 text-center mt-1 max-w-md">
                Pergunto qualquer coisa sobre seu negocio. Uso dados reais do seu pipeline, ads e conteudo.
              </p>

              <div className="grid grid-cols-2 gap-2 mt-6 w-full max-w-md">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleSend(action.label)}
                    className="flex items-center gap-2 p-3 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl text-xs text-slate-600 text-left transition-all"
                  >
                    <action.icon className="h-4 w-4 shrink-0" />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] ${msg.role === "user" ? "" : "flex gap-2"}`}>
                {msg.role === "assistant" && (
                  <div className="h-7 w-7 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                <div className={`rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-50 text-slate-800"
                }`}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="flex gap-2">
                <div className="h-7 w-7 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-slate-50 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
                  <span className="text-sm text-slate-500">Analisando dados...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-slate-100 p-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Pergunte qualquer coisa sobre seu negocio..."
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={sending}
          />
          <button
            onClick={() => handleSend()}
            disabled={sending || !input.trim()}
            className="h-10 w-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
