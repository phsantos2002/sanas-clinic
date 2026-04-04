"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  MessageCircle, Clock, Shield, Filter, RefreshCw, Volume2,
  Plus, X, ChevronDown, ChevronUp, Info,
} from "lucide-react";
import type { AIResponseConfig } from "@/app/actions/aiResponseConfig";

const VOICES = [
  { id: "alloy", label: "Alloy (Neutro)" },
  { id: "echo", label: "Echo (Masculino)" },
  { id: "fable", label: "Fable (Narrativo)" },
  { id: "onyx", label: "Onyx (Grave)" },
  { id: "nova", label: "Nova (Feminino)" },
  { id: "shimmer", label: "Shimmer (Suave)" },
];

const DEFAULTS: AIResponseConfig = {
  keepUnread: true,
  singleMessage: true,
  includeContactName: false,
  cancelOnNewMsg: true,
  pauseAfterManual: true,
  delayPerChar: 120,
  delayMax: 10000,
  waitBeforeReply: 7,
  humanIntervention: true,
  humanPauseHours: 2,
  whitelist: [],
  blacklist: [],
  ignoreGroups: true,
  followUpEnabled: false,
  followUpMessages: 1,
  followUpCheckMins: 10,
  followUpIntervalH: 25,
  followUpUseAI: true,
  followUpRespectBH: false,
  unknownTypeMsg: "Você pode me dar mais detalhes?",
  audioVoice: "alloy",
  audioMinChars: 50,
  audioAutoReply: false,
  audioReplaceText: false,
};

type SectionKey = "response" | "timers" | "human" | "filters" | "followup" | "audio";

export function AIResponseConfigForm({ initial, onSave }: {
  initial: AIResponseConfig | null;
  onSave: (data: AIResponseConfig) => Promise<{ success: boolean; error?: string }>;
}) {
  const [config, setConfig] = useState<AIResponseConfig>(initial || DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<SectionKey | null>("response");
  const [newWhitelist, setNewWhitelist] = useState("");
  const [newBlacklist, setNewBlacklist] = useState("");

  const update = <K extends keyof AIResponseConfig>(key: K, value: AIResponseConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await onSave(config);
    setSaving(false);
    if (result.success) toast.success("Configuracoes de IA salvas!");
    else toast.error(result.error || "Erro ao salvar");
  };

  const toggleSection = (key: SectionKey) => {
    setExpanded(prev => prev === key ? null : key);
  };

  const addToList = (list: "whitelist" | "blacklist") => {
    const value = list === "whitelist" ? newWhitelist : newBlacklist;
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length < 10) { toast.error("Numero invalido"); return; }
    update(list, [...config[list], cleaned]);
    if (list === "whitelist") setNewWhitelist("");
    else setNewBlacklist("");
  };

  const removeFromList = (list: "whitelist" | "blacklist", index: number) => {
    update(list, config[list].filter((_, i) => i !== index));
  };

  const Toggle = ({ value, onChange, label, desc }: { value: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) => (
    <label className="flex items-start gap-3 py-2.5 cursor-pointer group">
      <div className="flex-1 min-w-0">
        <span className="text-sm text-slate-700 font-medium block">{label}</span>
        {desc && <span className="text-xs text-slate-400 block mt-0.5">{desc}</span>}
      </div>
      <button type="button" onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 mt-0.5 ${value ? "bg-indigo-600" : "bg-slate-200"}`}>
        <span className={`absolute top-0.5 left-0.5 h-4 w-4 bg-white rounded-full shadow transition-transform ${value ? "translate-x-5" : ""}`} />
      </button>
    </label>
  );

  const NumberInput = ({ value, onChange, label, desc, min, max, suffix }: { value: number; onChange: (v: number) => void; label: string; desc?: string; min?: number; max?: number; suffix?: string }) => (
    <div className="py-2">
      <label className="text-sm text-slate-700 font-medium block">{label}</label>
      {desc && <span className="text-xs text-slate-400 block mt-0.5 mb-1.5">{desc}</span>}
      <div className="flex items-center gap-2">
        <input type="number" value={value} onChange={e => onChange(Number(e.target.value))}
          min={min} max={max}
          className="w-24 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        {suffix && <span className="text-xs text-slate-400">{suffix}</span>}
      </div>
    </div>
  );

  const Section = ({ id, icon: Icon, title, color, children }: { id: SectionKey; icon: typeof MessageCircle; title: string; color: string; children: React.ReactNode }) => (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <button onClick={() => toggleSection(id)} className={`w-full flex items-center gap-3 px-4 py-3 text-left ${expanded === id ? "bg-slate-50" : "hover:bg-slate-25"}`}>
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-sm font-semibold text-slate-800 flex-1">{title}</span>
        {expanded === id ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>
      {expanded === id && <div className="px-4 pb-4 divide-y divide-slate-50">{children}</div>}
    </div>
  );

  return (
    <div className="space-y-4">
      <Section id="response" icon={MessageCircle} title="Configuracoes de Resposta" color="text-green-600">
        <Toggle value={config.keepUnread} onChange={v => update("keepUnread", v)}
          label="Manter nao lida ao responder" desc="Marca a conversa como nao lida apos IA responder" />
        <Toggle value={config.singleMessage} onChange={v => update("singleMessage", v)}
          label="Enviar resposta em uma mensagem" desc="Consolida a resposta da IA em 1 unica mensagem" />
        <Toggle value={config.includeContactName} onChange={v => update("includeContactName", v)}
          label="Incluir nome do contato" desc="A IA usa o nome do lead na resposta" />
        <Toggle value={config.cancelOnNewMsg} onChange={v => update("cancelOnNewMsg", v)}
          label="Cancelar ao receber nova mensagem" desc="Se o lead enviar outra msg enquanto IA processa, cancela a anterior" />
        <Toggle value={config.pauseAfterManual} onChange={v => update("pauseAfterManual", v)}
          label="Nao responder apos mensagem manual" desc="Pausa a IA quando voce responde manualmente" />
        <div className="py-2">
          <label className="text-sm text-slate-700 font-medium block">Mensagem para tipos desconhecidos</label>
          <span className="text-xs text-slate-400 block mt-0.5 mb-1.5">Enviada quando receber audio, sticker, etc</span>
          <input type="text" value={config.unknownTypeMsg} onChange={e => update("unknownTypeMsg", e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </Section>

      <Section id="timers" icon={Clock} title="Tempo e Humanizacao" color="text-amber-600">
        <NumberInput value={config.waitBeforeReply} onChange={v => update("waitBeforeReply", v)}
          label="Aguardar antes de responder" desc="Tempo de espera antes de processar a mensagem" min={0} max={30} suffix="segundos" />
        <NumberInput value={config.delayPerChar} onChange={v => update("delayPerChar", v)}
          label="Delay por caractere" desc="Simula tempo de digitacao" min={0} max={500} suffix="ms" />
        <NumberInput value={config.delayMax} onChange={v => update("delayMax", v)}
          label="Delay maximo" desc="Limite do tempo de digitacao" min={0} max={30000} suffix="ms" />
      </Section>

      <Section id="human" icon={Shield} title="Intervencao Humana" color="text-blue-600">
        <Toggle value={config.humanIntervention} onChange={v => update("humanIntervention", v)}
          label="Ativar intervencao humana" desc="Pausa a IA automaticamente quando voce responde manualmente" />
        <NumberInput value={config.humanPauseHours} onChange={v => update("humanPauseHours", v)}
          label="Reativacao" desc="Horas para reativar a IA apos intervencao" min={1} max={72} suffix="horas" />
      </Section>

      <Section id="filters" icon={Filter} title="Filtros de Numero" color="text-red-600">
        <Toggle value={config.ignoreGroups} onChange={v => update("ignoreGroups", v)}
          label="Ignorar grupos" desc="A IA nao responde em grupos do WhatsApp" />

        <div className="py-3">
          <label className="text-sm text-slate-700 font-medium block mb-2">Somente Responder (whitelist)</label>
          <div className="flex gap-2 mb-2">
            <input type="text" value={newWhitelist} onChange={e => setNewWhitelist(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addToList("whitelist")}
              placeholder="5511999998888" className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <button onClick={() => addToList("whitelist")} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"><Plus className="h-4 w-4" /></button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {config.whitelist.map((num, i) => (
              <span key={i} className="flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2 py-1 rounded-lg">
                {num} <button onClick={() => removeFromList("whitelist", i)}><X className="h-3 w-3" /></button>
              </span>
            ))}
            {config.whitelist.length === 0 && <span className="text-xs text-slate-400">Vazio = responde todos</span>}
          </div>
        </div>

        <div className="py-3">
          <label className="text-sm text-slate-700 font-medium block mb-2">Nao Responder (blacklist)</label>
          <div className="flex gap-2 mb-2">
            <input type="text" value={newBlacklist} onChange={e => setNewBlacklist(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addToList("blacklist")}
              placeholder="5511999998888" className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <button onClick={() => addToList("blacklist")} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Plus className="h-4 w-4" /></button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {config.blacklist.map((num, i) => (
              <span key={i} className="flex items-center gap-1 bg-red-50 text-red-700 text-xs px-2 py-1 rounded-lg">
                {num} <button onClick={() => removeFromList("blacklist", i)}><X className="h-3 w-3" /></button>
              </span>
            ))}
            {config.blacklist.length === 0 && <span className="text-xs text-slate-400">Nenhum numero bloqueado</span>}
          </div>
        </div>
      </Section>

      <Section id="followup" icon={RefreshCw} title="Follow-Up Automatico" color="text-violet-600">
        <Toggle value={config.followUpEnabled} onChange={v => update("followUpEnabled", v)}
          label="Ativar Follow-Up" desc="Envia mensagens automaticas para leads sem resposta" />
        {config.followUpEnabled && (
          <>
            <Toggle value={config.followUpUseAI} onChange={v => update("followUpUseAI", v)}
              label="Gerar mensagens por IA" desc="A IA cria mensagens personalizadas de follow-up" />
            <NumberInput value={config.followUpMessages} onChange={v => update("followUpMessages", v)}
              label="Quantidade de mensagens" min={1} max={5} />
            <NumberInput value={config.followUpCheckMins} onChange={v => update("followUpCheckMins", v)}
              label="Verificar a cada" min={5} max={60} suffix="minutos" />
            <NumberInput value={config.followUpIntervalH} onChange={v => update("followUpIntervalH", v)}
              label="Intervalo entre mensagens" min={1} max={72} suffix="horas" />
            <Toggle value={config.followUpRespectBH} onChange={v => update("followUpRespectBH", v)}
              label="Respeitar horario comercial" desc="So envia durante horario comercial (8h-18h)" />
          </>
        )}
      </Section>

      <Section id="audio" icon={Volume2} title="Audio com IA" color="text-emerald-600">
        <Toggle value={config.audioAutoReply} onChange={v => update("audioAutoReply", v)}
          label="Resposta automatica com audio" desc="Quando receber audio, responde com audio" />
        <Toggle value={config.audioReplaceText} onChange={v => update("audioReplaceText", v)}
          label="Substituir texto por audio" desc="Envia apenas audio (sem texto)" />
        <div className="py-2">
          <label className="text-sm text-slate-700 font-medium block mb-1.5">Voz</label>
          <select value={config.audioVoice} onChange={e => update("audioVoice", e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </div>
        <NumberInput value={config.audioMinChars} onChange={v => update("audioMinChars", v)}
          label="Minimo de caracteres para audio" desc="Respostas menores nao geram audio" min={20} max={500} suffix="caracteres" />
      </Section>

      <button onClick={handleSave} disabled={saving}
        className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50">
        {saving ? "Salvando..." : "Salvar Configuracoes de IA"}
      </button>
    </div>
  );
}
