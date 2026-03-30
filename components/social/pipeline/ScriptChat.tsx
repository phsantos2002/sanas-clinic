"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Check, FileText } from "lucide-react";
import { toast } from "sonner";
import { sendChatMessage, generateStoryScript, approveScript } from "@/app/actions/pipeline";

type Message = { id: string; role: string; content: string; createdAt: Date };

export function ScriptChat({ storyId, messages, hasScript, scriptJson, status }: {
  storyId: string;
  messages: Message[];
  hasScript: boolean;
  scriptJson: Record<string, unknown> | null;
  status: string;
}) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [localMessages, setLocalMessages] = useState(messages);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [localMessages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const msg = input.trim();
    setInput("");
    setSending(true);

    setLocalMessages((prev) => [...prev, { id: `temp-${Date.now()}`, role: "user", content: msg, createdAt: new Date() }]);

    const result = await sendChatMessage(storyId, msg);
    setSending(false);

    if (result.success && result.data) {
      setLocalMessages((prev) => [...prev, { id: `ai-${Date.now()}`, role: "assistant", content: result.data!.reply, createdAt: new Date() }]);
    } else {
      toast.error(result.success ? "Erro" : result.error);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const result = await generateStoryScript(storyId);
    setGenerating(false);
    if (result.success) {
      toast.success("Roteiro gerado! Revise e aprove.");
      window.location.reload();
    } else {
      toast.error(result.success ? "Erro" : result.error);
    }
  };

  const handleApprove = async () => {
    const result = await approveScript(storyId);
    if (result.success) {
      toast.success("Roteiro aprovado! Proximo: personagens.");
      window.location.reload();
    }
  };

  const script = scriptJson as { title?: string; hook?: string; scenes?: { sceneTitle: string; narration: string }[] } | null;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
      {/* Chat Messages */}
      <div className="h-[400px] overflow-y-auto p-4 space-y-3">
        {localMessages.length === 0 && (
          <div className="text-center py-12">
            <Sparkles className="h-10 w-10 text-violet-200 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Descreva sua ideia de video para a IA ajudar a desenvolver o roteiro.</p>
            <p className="text-xs text-slate-400 mt-1">Ex: &quot;Quero um reels desmistificando 3 mitos sobre botox&quot;</p>
          </div>
        )}
        {localMessages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
              msg.role === "user" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-800"
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-2xl px-4 py-2.5">
              <div className="flex gap-1"><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" /><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100" /><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200" /></div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Script Preview */}
      {hasScript && script && (
        <div className="border-t border-slate-100 p-4 bg-violet-50">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-violet-600" />
            <h4 className="font-semibold text-violet-900 text-sm">Roteiro Gerado: {script.title}</h4>
          </div>
          {script.hook && <p className="text-xs text-violet-700 mb-2">Hook: &quot;{script.hook}&quot;</p>}
          <div className="space-y-1">
            {script.scenes?.map((s, i) => (
              <p key={i} className="text-xs text-violet-600">Cena {i + 1}: {s.sceneTitle} — &quot;{s.narration.slice(0, 60)}...&quot;</p>
            ))}
          </div>
          {status === "script_review" && (
            <div className="flex gap-2 mt-3">
              <button onClick={handleGenerate} disabled={generating} className="px-3 py-1.5 border border-violet-200 text-violet-700 rounded-lg text-xs font-medium hover:bg-violet-100">
                Regenerar
              </button>
              <button onClick={handleApprove} className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700 flex items-center gap-1">
                <Check className="h-3 w-3" /> Aprovar e Avancar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-slate-100 p-3 flex gap-2">
        <input
          type="text" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Descreva sua ideia de video..."
          className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          disabled={sending}
        />
        {!hasScript && localMessages.length >= 2 && (
          <button onClick={handleGenerate} disabled={generating}
            className="px-3 py-2 bg-violet-100 text-violet-700 rounded-xl text-sm font-medium hover:bg-violet-200 disabled:opacity-50 flex items-center gap-1">
            <Sparkles className="h-4 w-4" /> {generating ? "Gerando..." : "Gerar Roteiro"}
          </button>
        )}
        <button onClick={handleSend} disabled={sending || !input.trim()}
          className="h-10 w-10 bg-violet-600 text-white rounded-xl flex items-center justify-center hover:bg-violet-700 disabled:opacity-50">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
