"use client";

import {
  MapPin, Star, Clock, Phone, Globe, Store,
  ExternalLink, Image, MessageSquare, TrendingUp,
  Eye, MousePointer, Navigation, PhoneCall,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function GooglePageClient() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Store className="h-6 w-6 text-amber-500" /> Google Meu Negócio
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Gerencie a presença da sua clínica no Google Maps e na Busca
        </p>
      </div>

      {/* Connection status */}
      <Card className="border-amber-100 bg-gradient-to-br from-amber-50/50 to-white rounded-2xl shadow-sm">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Store className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-base font-bold text-slate-900">Integração em desenvolvimento</p>
              <p className="text-sm text-slate-500 mt-1">
                A integração com a API do Google Business Profile está sendo preparada.
                Em breve você poderá gerenciar avaliações, posts e métricas diretamente por aqui.
              </p>
              <a
                href="https://business.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-amber-600 hover:text-amber-800 transition-colors"
              >
                Abrir Google Meu Negócio
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas que serão exibidas */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Métricas do seu perfil</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Visualizações", icon: Eye, value: "—", bg: "bg-blue-50", color: "text-blue-600" },
            { label: "Cliques no site", icon: MousePointer, value: "—", bg: "bg-violet-50", color: "text-violet-600" },
            { label: "Pedidos de rota", icon: Navigation, value: "—", bg: "bg-emerald-50", color: "text-emerald-600" },
            { label: "Ligações", icon: PhoneCall, value: "—", bg: "bg-amber-50", color: "text-amber-600" },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white border border-slate-100 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{kpi.label}</p>
                <div className={`w-8 h-8 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-300">{kpi.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Funcionalidades */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">O que você poderá gerenciar</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard
            icon={Star}
            title="Avaliações"
            description="Veja e responda avaliações dos clientes sem sair do CRM."
            color="text-amber-500"
            bg="bg-amber-50"
          />
          <FeatureCard
            icon={MessageSquare}
            title="Posts & Novidades"
            description="Publique ofertas, novidades e eventos no seu perfil do Google."
            color="text-violet-500"
            bg="bg-violet-50"
          />
          <FeatureCard
            icon={Image}
            title="Fotos do Negócio"
            description="Gerencie fotos da clínica, equipe e procedimentos."
            color="text-indigo-500"
            bg="bg-indigo-50"
          />
          <FeatureCard
            icon={Clock}
            title="Horários"
            description="Atualize horários de atendimento, feriados e horários especiais."
            color="text-blue-500"
            bg="bg-blue-50"
          />
          <FeatureCard
            icon={MapPin}
            title="Localização"
            description="Mantenha endereço e informações do Google Maps atualizados."
            color="text-red-500"
            bg="bg-red-50"
          />
          <FeatureCard
            icon={TrendingUp}
            title="Insights"
            description="Visualizações, cliques, ligações e pedidos de rota ao longo do tempo."
            color="text-emerald-500"
            bg="bg-emerald-50"
          />
        </div>
      </div>

      {/* Dica de conversão WhatsApp */}
      <Card className="border-emerald-100 bg-emerald-50/30 rounded-2xl shadow-sm">
        <CardContent className="py-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Phone className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-900">Dica: Conversão via WhatsApp</p>
              <p className="text-xs text-emerald-700/70 mt-1 leading-relaxed">
                Configure o link do WhatsApp no seu perfil do Google Meu Negócio.
                Quando clientes clicarem em &quot;Enviar mensagem&quot;, serão direcionados
                para o WhatsApp e entrarão automaticamente no seu pipeline como novos leads.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
  bg,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
