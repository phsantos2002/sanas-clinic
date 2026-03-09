"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveAIConfig, type AIConfigData } from "@/app/actions/aiConfig";
import { toast } from "sonner";

type Props = {
  config: AIConfigData;
};

export function AIConfigForm({ config }: Props) {
  const [clinicName, setClinicName] = useState(config.clinicName);
  const [systemPrompt, setSystemPrompt] = useState(config.systemPrompt);
  const [sendAudio, setSendAudio] = useState(config.sendAudio);
  const [openaiKey, setOpenaiKey] = useState(config.openaiKey);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await saveAIConfig({ clinicName, systemPrompt, sendAudio, openaiKey });
    setLoading(false);
    if (result.success) {
      toast.success("Configurações de IA salvas");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="clinicName">Nome da clínica</Label>
        <Input
          id="clinicName"
          value={clinicName}
          onChange={(e) => setClinicName(e.target.value)}
          placeholder="Sanas Clinic"
        />
        <p className="text-xs text-zinc-400">
          Usado pela IA ao se apresentar e nas respostas.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="systemPrompt">Prompt personalizado</Label>
        <textarea
          id="systemPrompt"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={8}
          placeholder={`Deixe em branco para usar o prompt padrão.\n\nExemplo:\nVocê é a Mari, assistente da Sanas Clinic. Atendemos procedimentos de botox, harmonização facial e limpeza de pele. Nosso horário é de segunda a sábado, das 9h às 18h. Sempre pergunte o nome da pessoa e o procedimento de interesse antes de oferecer o agendamento.`}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black resize-none"
        />
        <p className="text-xs text-zinc-400">
          Descreva os serviços, horários, preços e o tom de voz da IA. Se vazio, usa o comportamento padrão.
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-zinc-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Enviar áudio</p>
            <p className="text-xs text-zinc-400">
              A IA envia a resposta também em formato de áudio de voz.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSendAudio((prev) => !prev)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
              sendAudio ? "bg-black" : "bg-zinc-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ${
                sendAudio ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {sendAudio && (
          <div className="space-y-1.5 pt-2 border-t border-zinc-100">
            <Label htmlFor="openaiKey">Chave da API OpenAI (para voz)</Label>
            <Input
              id="openaiKey"
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
            />
            <p className="text-xs text-zinc-400">
              Necessária para gerar o áudio. Obtenha em{" "}
              <span className="text-zinc-600 font-mono">platform.openai.com/api-keys</span>
            </p>
          </div>
        )}
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Salvando..." : "Salvar configurações"}
      </Button>
    </form>
  );
}
