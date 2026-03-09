"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, BotOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toggleAI, sendManualMessage } from "@/app/actions/messages";
import { toast } from "sonner";

type Message = {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
};

type Lead = {
  id: string;
  name: string;
  phone: string;
  aiEnabled: boolean;
  stage: { name: string } | null;
  messages: Message[];
};

type Props = {
  lead: Lead;
};

export function ChatPanel({ lead }: Props) {
  const [messages, setMessages] = useState(lead.messages);
  const [aiEnabled, setAiEnabled] = useState(lead.aiEnabled);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(lead.messages);
    setAiEnabled(lead.aiEnabled);
  }, [lead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleToggleAI() {
    const result = await toggleAI(lead.id);
    if (result.success) {
      setAiEnabled((prev) => !prev);
      toast.success(aiEnabled ? "IA desativada para este chat" : "IA ativada");
    }
  }

  async function handleSend() {
    if (!text.trim()) return;
    setSending(true);
    const content = text.trim();
    setText("");

    // Optimistic update
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "assistant", content, createdAt: new Date() },
    ]);

    const result = await sendManualMessage(lead.id, content);
    setSending(false);
    if (!result.success) toast.error(result.error);
  }

  function formatTime(date: Date) {
    return new Date(date).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
        <div>
          <p className="font-medium text-sm">{lead.name}</p>
          <p className="text-xs text-zinc-400">{lead.phone}</p>
        </div>
        <div className="flex items-center gap-2">
          {lead.stage && (
            <Badge variant="secondary" className="text-xs">{lead.stage.name}</Badge>
          )}
          <Button
            size="sm"
            variant={aiEnabled ? "default" : "outline"}
            onClick={handleToggleAI}
            className="gap-1.5 text-xs h-7"
          >
            {aiEnabled ? <Bot className="h-3.5 w-3.5" /> : <BotOff className="h-3.5 w-3.5" />}
            IA {aiEnabled ? "Ativa" : "Desativada"}
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-zinc-400">Nenhuma mensagem ainda</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "assistant" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                msg.role === "assistant"
                  ? "bg-black text-white rounded-br-sm"
                  : "bg-zinc-100 text-zinc-900 rounded-bl-sm"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              <p className={`text-[10px] mt-1 ${msg.role === "assistant" ? "text-zinc-400" : "text-zinc-400"}`}>
                {formatTime(msg.createdAt)}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-zinc-200 flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Digite uma mensagem..."
          className="h-9 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={sending}
        />
        <Button size="sm" onClick={handleSend} disabled={sending || !text.trim()} className="h-9 px-3">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
