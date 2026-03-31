"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Send, Clapperboard, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { sendStudioMessage, createStudioProject, getStudioProject } from "@/app/actions/studioChat";

type Message = { role: string; content: string };

const QUICK_PROMPTS = [
  "Quero um post educativo sobre botox pra Instagram",
  "Monta uma campanha de 5 posts sobre harmonizacao",
  "Cria um Reels de 30 segundos sobre limpeza de pele",
  "Me da 5 ideias de conteudo pra essa semana",
  "Cria um carrossel de mitos e verdades sobre preenchimento",
  "Escreve uma caption pra foto da clinica",
];

export function StudioChatClient() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("project");

  const [projectId, setProjectId] = useState<string | null>(projectIdParam);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(!!projectIdParam);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Load existing project
  useEffect(() => {
    if (!projectIdParam) return;
    setLoading(true);
    getStudioProject(projectIdParam).then((project) => {
      if (project) {
        setMessages(project.chatMessages.map((m) => ({ role: m.role, content: m.content })));
      }
      setLoading(false);
    });
  }, [projectIdParam]);

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || sending) return;
    setInput("");
    setSending(true);

    // Create project if none exists
    let currentProjectId = projectId;
    if (!currentProjectId) {
      const result = await createStudioProject({ title: msg.slice(0, 60) });
      if (result.success && result.data) {
        currentProjectId = result.data.id;
        setProjectId(currentProjectId);
      } else {
        toast.error("Erro ao criar projeto");
        setSending(false);
        return;
      }
    }

    setMessages((prev) => [...prev, { role: "user", content: msg }]);

    const result = await sendStudioMessage(currentProjectId, msg);
    setSending(false);

    if (result.success && result.data) {
      setMessages((prev) => [...prev, { role: "assistant", content: result.data!.reply }]);
    } else {
      toast.error(result.success ? "Erro" : result.error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        <div className="h-[calc(100vh-320px)] min-h-[400px] overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="h-14 w-14 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                <Clapperboard className="h-7 w-7 text-white" />
              </div>
              <h2 className="font-bold text-slate-900 text-lg">Chat do Estudio</h2>
              <p className="text-sm text-slate-400 text-center mt-1 max-w-md">
                Descreva o que voce quer criar e a IA produz o conteudo usando seus assets do Acervo.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-6 w-full max-w-md">
                {QUICK_PROMPTS.map((prompt) => (
                  <button key={prompt} onClick={() => handleSend(prompt)}
                    className="p-3 bg-slate-50 hover:bg-violet-50 hover:text-violet-700 rounded-xl text-xs text-slate-600 text-left transition-all">
                    <Sparkles className="h-3 w-3 inline mr-1" />{prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user" ? "bg-violet-600 text-white" : "bg-slate-50 text-slate-800"
              }`}>
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-slate-50 rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 text-violet-500 animate-spin" />
                <span className="text-sm text-slate-500">Criando conteudo...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-slate-100 p-3 flex gap-2">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Descreva o que voce quer criar..."
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            disabled={sending} />
          <button onClick={() => handleSend()} disabled={sending || !input.trim()}
            className="h-10 w-10 bg-violet-600 text-white rounded-xl flex items-center justify-center hover:bg-violet-700 disabled:opacity-50">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
