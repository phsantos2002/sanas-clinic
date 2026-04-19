"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Quais leads quentes estão sem resposta?",
  "Quantos SQLs os SDRs passaram hoje?",
  "Qual campanha Meta tem o menor CPL?",
  "Faça um resumo do meu pipeline agora.",
];

export function DashboardChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      toast.error("Erro de conexão");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-50">
        <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shrink-0">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900 text-sm">Assistente</h3>
          <p className="text-[11px] text-slate-400">Pergunte qualquer coisa do seu negócio</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[280px]">
        {messages.length === 0 && (
          <div className="flex flex-col h-full justify-center">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
              <Sparkles className="h-3 w-3" /> Sugestões
            </div>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-left text-xs text-slate-600 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg px-3 py-2 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[88%] ${msg.role === "user" ? "" : "flex gap-2"}`}>
              {msg.role === "assistant" && (
                <div className="h-6 w-6 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-md flex items-center justify-center shrink-0 mt-1">
                  <Bot className="h-3 w-3 text-white" />
                </div>
              )}
              <div
                className={`rounded-xl px-3 py-2 text-xs ${
                  msg.role === "user" ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-800"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="flex gap-2">
              <div className="h-6 w-6 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-md flex items-center justify-center shrink-0">
                <Bot className="h-3 w-3 text-white" />
              </div>
              <div className="bg-slate-50 rounded-xl px-3 py-2 flex items-center gap-2">
                <Loader2 className="h-3 w-3 text-indigo-500 animate-spin" />
                <span className="text-xs text-slate-500">Analisando...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-100 p-2 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Pergunte algo..."
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={sending}
        />
        <button
          onClick={() => handleSend()}
          disabled={sending || !input.trim()}
          className="h-8 w-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 transition-colors shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
