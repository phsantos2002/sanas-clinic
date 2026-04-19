"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveAIConfig, type AIConfigData } from "@/app/actions/aiConfig";
import { toast } from "sonner";
import { Copy, Check, Upload, X, Mic } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import Image from "next/image";

type Props = {
  config: AIConfigData;
};

const OPENAI_MODELS = [
  { id: "gpt-4o-mini", label: "GPT-4o Mini", capabilities: "text" },
  { id: "gpt-4o", label: "GPT-4o", capabilities: "multimodal" },
  { id: "gpt-4-turbo", label: "GPT-4 Turbo", capabilities: "multimodal" },
];

const GEMINI_MODELS = [
  { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", capabilities: "multimodal" },
  { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", capabilities: "multimodal" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", capabilities: "multimodal" },
];

const VOICE_CLONE_PROMPT = `Olá! Vou gravar um áudio de referência para que a IA possa clonar minha voz e responder aos clientes com naturalidade.

Meu nome é [SEU NOME], sou [SUA PROFISSÃO/CARGO] na [NOME DO NEGÓCIO].

Vou falar agora de forma natural, como se estivesse conversando com um cliente:

"Olá, tudo bem? Seja muito bem-vindo! Fico feliz que tenha entrado em contato conosco. Aqui na [NOME DA EMPRESA] a gente trabalha com [DESCREVA BREVEMENTE SEUS SERVIÇOS]. Nosso objetivo é sempre oferecer o melhor atendimento possível. Qualquer dúvida que você tiver, pode me perguntar que eu vou te ajudar com o maior prazer. Ah, e se quiser agendar um horário, é só me avisar que a gente encontra o melhor dia e horário para você. Vai ser um prazer te receber aqui!"

Agora vou repetir com variações de tom e velocidade para capturar melhor as nuances da minha voz:

"Que maravilha, muito obrigado pelo seu interesse! Vamos sim encontrar o melhor tratamento para você. Pode ficar tranquilo que estamos aqui para te ajudar em tudo que precisar."

"Perfeito! Deixa eu verificar aqui na agenda... Temos disponibilidade na terça-feira às 14h ou na quinta às 10h. Qual fica melhor para você?"`;

export function AIConfigForm({ config }: Props) {
  const [clinicName, setClinicName] = useState(config.clinicName);
  const [systemPrompt, setSystemPrompt] = useState(config.systemPrompt);
  const [sendAudio, setSendAudio] = useState(config.sendAudio);
  const [provider, setProvider] = useState(config.provider);
  const [model, setModel] = useState(config.model);
  const [capabilities, setCapabilities] = useState(config.capabilities);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [voiceClonePrompt, setVoiceClonePrompt] = useState(
    config.voiceClonePrompt || VOICE_CLONE_PROMPT
  );
  const [openaiKey, setOpenaiKey] = useState(config.openaiKey);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const availableModels = provider === "openai" ? OPENAI_MODELS : GEMINI_MODELS;

  function handleProviderChange(newProvider: string) {
    setProvider(newProvider);
    const models = newProvider === "openai" ? OPENAI_MODELS : GEMINI_MODELS;
    setModel(models[0].id);
    setCapabilities(models[0].capabilities);
  }

  function handleModelChange(modelId: string) {
    setModel(modelId);
    const found = availableModels.find((m) => m.id === modelId);
    if (found) setCapabilities(found.capabilities);
  }

  async function handleCopyPrompt() {
    await navigator.clipboard.writeText(voiceClonePrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey.trim()) {
      toast.error("Informe a chave de API do provedor selecionado");
      return;
    }
    setLoading(true);
    const result = await saveAIConfig({
      clinicName,
      systemPrompt,
      sendAudio,
      provider,
      model,
      capabilities,
      apiKey,
      voiceClonePrompt,
      openaiKey,
    });
    setLoading(false);
    if (result.success) {
      toast.success("Configurações de IA salvas");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Provider selection */}
      <div className="space-y-1.5">
        <Label>Provedor de IA</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleProviderChange("openai")}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
              provider === "openai"
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            <Image src="/icons/openai.svg" alt="OpenAI" width={20} height={20} />
            ChatGPT (OpenAI)
          </button>
          <button
            type="button"
            onClick={() => handleProviderChange("gemini")}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
              provider === "gemini"
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            <Image src="/icons/gemini.svg" alt="Gemini" width={20} height={20} />
            Gemini (Google)
          </button>
        </div>
      </div>

      {/* Model selection */}
      <div className="space-y-1.5">
        <Label>Modelo</Label>
        <CustomSelect
          options={availableModels.map((m) => ({
            value: m.id,
            label: `${m.label} — ${m.capabilities === "multimodal" ? "Texto + Áudio + Imagem" : "Somente Texto"}`,
          }))}
          value={model}
          onChange={handleModelChange}
        />
        <p className="text-xs text-slate-400">
          {capabilities === "multimodal"
            ? "Este modelo aceita texto, áudio e imagens."
            : "Este modelo aceita apenas texto."}
        </p>
      </div>

      {/* API Key */}
      <div className="space-y-1.5">
        <Label htmlFor="apiKey">
          Chave de API {provider === "openai" ? "OpenAI" : "Google AI"}
        </Label>
        <Input
          id="apiKey"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={provider === "openai" ? "sk-..." : "AIza..."}
        />
        <p className="text-xs text-slate-400">
          {provider === "openai"
            ? "Obtenha em platform.openai.com/api-keys"
            : "Obtenha em aistudio.google.com/apikey"}
          . Você é responsável pelo uso e custos da sua chave.
        </p>
      </div>

      {/* Business name */}
      <div className="space-y-1.5">
        <Label htmlFor="clinicName">Nome do negócio</Label>
        <Input
          id="clinicName"
          value={clinicName}
          onChange={(e) => setClinicName(e.target.value)}
          placeholder="Ex: Consultório Silva, Loja Moderna, Imobiliária ABC..."
        />
        <p className="text-xs text-slate-400">
          Usado pela IA ao se apresentar nas conversas. Funciona para qualquer setor — B2C ou B2B.
        </p>
      </div>

      {/* System prompt */}
      <div className="space-y-1.5">
        <Label htmlFor="systemPrompt">Prompt personalizado</Label>
        <textarea
          id="systemPrompt"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={8}
          placeholder={`Deixe em branco para usar o prompt padrão.\n\nExemplo:\nVocê é a Mari, assistente da Sanas Pulse. Atendemos procedimentos de botox, harmonização facial e limpeza de pele. Nosso horário é de segunda a sábado, das 9h às 18h. Sempre pergunte o nome da pessoa e o procedimento de interesse antes de oferecer o agendamento.`}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 resize-none"
        />
        <p className="text-xs text-slate-400">
          Descreva os serviços, horários, preços e o tom de voz da IA. Se vazio, usa o comportamento
          padrão.
        </p>
      </div>

      {/* Audio settings */}
      <div className="space-y-3 rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">Enviar áudio</p>
            <p className="text-xs text-slate-400">
              A IA envia a resposta também em formato de áudio de voz.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSendAudio((prev) => !prev)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
              sendAudio ? "bg-indigo-500" : "bg-slate-200"
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
          <>
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <Label htmlFor="openaiKey">Chave da API OpenAI (para voz TTS)</Label>
              <Input
                id="openaiKey"
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-..."
              />
              <p className="text-xs text-slate-400">
                Necessária para gerar o áudio via OpenAI TTS.
              </p>
            </div>

            {/* Voice clone prompt */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <Label>Texto para Clonagem de Voz</Label>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copiado!" : "Copiar texto"}
                </button>
              </div>
              <textarea
                value={voiceClonePrompt}
                onChange={(e) => setVoiceClonePrompt(e.target.value)}
                rows={6}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 resize-none"
              />
              <div className="bg-indigo-50 rounded-xl p-3 space-y-1.5">
                <p className="text-xs font-semibold text-indigo-700">Como usar:</p>
                <ol className="text-xs text-indigo-600 space-y-1 list-decimal list-inside">
                  <li>Copie o texto acima e personalize com seus dados</li>
                  <li>Grave um áudio lendo o texto em voz natural e clara</li>
                  <li>Envie o áudio abaixo para usar como referência de voz</li>
                  <li>Fale devagar, com boa dicção e em um ambiente silencioso</li>
                </ol>
              </div>
            </div>

            {/* Audio upload */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <Label>Áudio de Referência</Label>
              {audioFile || audioUrl ? (
                <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Mic className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">
                      {audioFile?.name || "Áudio carregado"}
                    </p>
                    {audioFile && (
                      <p className="text-[10px] text-slate-400">
                        {(audioFile.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    )}
                    {audioUrl && (
                      <audio controls className="mt-1.5 w-full h-8" src={audioUrl}>
                        <track kind="captions" />
                      </audio>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAudioFile(null);
                      setAudioUrl(null);
                    }}
                    className="p-1 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 py-6 px-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
                  <Upload className="h-6 w-6 text-slate-400" />
                  <span className="text-xs text-slate-500 text-center">
                    Arraste ou clique para enviar o áudio
                  </span>
                  <span className="text-[10px] text-slate-400">
                    MP3, WAV, OGG, M4A ou WEBM (máx. 25MB)
                  </span>
                  <input
                    type="file"
                    accept="audio/mp3,audio/mpeg,audio/wav,audio/ogg,audio/m4a,audio/webm,audio/x-m4a,.mp3,.wav,.ogg,.m4a,.webm"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setAudioFile(file);
                        setAudioUrl(URL.createObjectURL(file));
                      }
                    }}
                  />
                </label>
              )}
              <p className="text-xs text-slate-400">
                O áudio será usado como referência para clonar sua voz nas respostas da IA.
              </p>
            </div>
          </>
        )}
      </div>

      <Button type="submit" disabled={loading} className="rounded-xl">
        {loading ? "Salvando..." : "Salvar configurações"}
      </Button>
    </form>
  );
}
