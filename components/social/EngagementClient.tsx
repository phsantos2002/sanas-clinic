"use client";

import { useState } from "react";
import {
  MessageCircle,
  Heart,
  AlertCircle,
  Users,
  Filter,
  CheckCircle2,
  ThumbsUp,
  UserPlus,
  Clock,
} from "lucide-react";

// Placeholder data — in production this would come from Instagram/Facebook Graph API
// via a CRON that fetches comments and classifies them with AI
type Comment = {
  id: string;
  platform: string;
  postTitle: string;
  author: string;
  authorHandle: string;
  content: string;
  timestamp: string;
  classification: "question" | "praise" | "complaint" | "lead" | "spam";
  suggestedReply: string;
  isResponded: boolean;
};

const SAMPLE_EMPTY_STATE = true; // Will show empty state until CRON is implemented

const CLASS_CONFIG = {
  question: { label: "Pergunta", color: "bg-blue-100 text-blue-700", icon: MessageCircle },
  praise: { label: "Elogio", color: "bg-green-100 text-green-700", icon: Heart },
  complaint: { label: "Reclamacao", color: "bg-red-100 text-red-700", icon: AlertCircle },
  lead: { label: "Lead Detectado", color: "bg-amber-100 text-amber-700", icon: Users },
  spam: { label: "Spam", color: "bg-slate-100 text-slate-500", icon: AlertCircle },
};

export function EngagementClient() {
  const [filter, setFilter] = useState<string>("all");

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">Engajamento</h2>
          <p className="text-xs text-slate-400">
            Comentarios, mencoes e interacoes das redes sociais
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700"
          >
            <option value="all">Todos</option>
            <option value="pending">Pendentes</option>
            <option value="lead">Leads</option>
            <option value="question">Perguntas</option>
            <option value="praise">Elogios</option>
          </select>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pendentes", value: 0, icon: Clock, color: "text-amber-600 bg-amber-50" },
          {
            label: "Respondidos",
            value: 0,
            icon: CheckCircle2,
            color: "text-green-600 bg-green-50",
          },
          { label: "Leads detectados", value: 0, icon: Users, color: "text-blue-600 bg-blue-50" },
          {
            label: "Novos seguidores",
            value: 0,
            icon: UserPlus,
            color: "text-violet-600 bg-violet-50",
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-slate-100 rounded-xl p-3">
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center ${stat.color} mb-1`}
            >
              <stat.icon className="h-4 w-4" />
            </div>
            <p className="text-lg font-bold text-slate-900">{stat.value}</p>
            <p className="text-[11px] text-slate-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Info box */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <MessageCircle className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-medium text-indigo-800 text-sm">Central de Engajamento</h3>
            <p className="text-xs text-indigo-600 mt-1">
              Esta secao coleta automaticamente comentarios do Instagram, Facebook e TikTok. A IA
              classifica cada comentario (pergunta, elogio, lead, reclamacao) e sugere respostas
              personalizadas.
            </p>
            <div className="mt-3 space-y-1.5">
              <p className="text-xs text-indigo-700 font-medium">Para ativar:</p>
              <p className="text-xs text-indigo-600">
                1. Conecte suas redes sociais em Conteudo → Conexoes
              </p>
              <p className="text-xs text-indigo-600">
                2. Os comentarios serao coletados automaticamente
              </p>
              <p className="text-xs text-indigo-600">
                3. A IA gera respostas sugeridas — voce aprova com 1 toque
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white border border-slate-100 rounded-xl p-4">
        <h3 className="font-semibold text-slate-900 text-sm mb-3">Como funciona</h3>
        <div className="space-y-3">
          {[
            {
              step: "1",
              title: "Coleta automatica",
              desc: "CRON busca comentarios de todas as plataformas conectadas",
            },
            {
              step: "2",
              title: "Classificacao IA",
              desc: "Cada comentario e classificado: pergunta, elogio, lead, reclamacao, spam",
            },
            {
              step: "3",
              title: "Resposta sugerida",
              desc: "IA gera resposta personalizada usando contexto do seu negocio",
            },
            {
              step: "4",
              title: "Aprovacao 1-toque",
              desc: "Voce aprova, edita ou descarta — a resposta e enviada automaticamente",
            },
            {
              step: "5",
              title: "Captura de leads",
              desc: "Comentarios como 'quanto custa?' sao detectados e viram leads no Pipeline",
            },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="h-6 w-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                {item.step}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
