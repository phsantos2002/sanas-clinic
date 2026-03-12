"use client";

import { useState } from "react";
import {
  Users, MessageCircle, TrendingUp, BarChart2,
  MapPin, Star, Clock, Phone, Globe, Store,
  ExternalLink, Search as SearchIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleAdsIcon } from "@/components/icons/SourceIcons";
import { getStageColor } from "@/components/icons/SourceIcons";
import type { GoogleLeadStats } from "@/app/actions/google";

type Props = {
  leadsData: GoogleLeadStats | null;
  hasGAConfig: boolean;
  measurementId: string | null;
};

export function GooglePageClient({ leadsData, hasGAConfig, measurementId }: Props) {
  const [activeTab, setActiveTab] = useState<"ads" | "business">("ads");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <GoogleAdsIcon size={24} /> Google
          </h1>
          <p className="text-sm text-slate-400 mt-1">Google Ads e Google Meu Negócio</p>
        </div>
        {hasGAConfig && measurementId && (
          <span className="text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full">
            GA: <span className="font-mono text-slate-700">{measurementId}</span>
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab("ads")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "ads"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <BarChart2 className="h-3.5 w-3.5" />
            Google Ads
          </span>
        </button>
        <button
          onClick={() => setActiveTab("business")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "business"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Store className="h-3.5 w-3.5" />
            Meu Negócio
          </span>
        </button>
      </div>

      {activeTab === "ads" ? (
        <GoogleAdsTab leadsData={leadsData} hasGAConfig={hasGAConfig} />
      ) : (
        <GoogleBusinessTab />
      )}
    </div>
  );
}

// ─── Google Ads Tab ───

function GoogleAdsTab({
  leadsData,
  hasGAConfig,
}: {
  leadsData: GoogleLeadStats | null;
  hasGAConfig: boolean;
}) {
  if (!leadsData) {
    return (
      <Card className="border-slate-100 rounded-2xl">
        <CardContent className="py-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto">
            <GoogleAdsIcon size={28} />
          </div>
          <p className="text-sm font-semibold text-slate-700">Conecte o Google Analytics</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Configure o Measurement ID em<br />
            <span className="font-medium text-indigo-600">Configurações → Google Analytics</span>
            <br />para rastrear leads do Google Ads.
          </p>
        </CardContent>
      </Card>
    );
  }

  const conversionRate = leadsData.total > 0
    ? Math.round((leadsData.withConversation / leadsData.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Leads do Google", value: leadsData.total.toString(), icon: Users, bg: "bg-amber-50", color: "text-amber-600" },
          { label: "Com Conversa", value: leadsData.withConversation.toString(), icon: MessageCircle, bg: "bg-violet-50", color: "text-violet-600" },
          { label: "Taxa Conversa", value: `${conversionRate}%`, icon: TrendingUp, bg: "bg-emerald-50", color: "text-emerald-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-slate-100 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{kpi.label}</p>
              <div className={`w-8 h-8 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Pipeline breakdown */}
      <Card className="border-slate-100 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900">Leads Google por Estágio</CardTitle>
        </CardHeader>
        <CardContent>
          {leadsData.byStage.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Sem dados</p>
          ) : (
            <div className="space-y-2">
              {leadsData.byStage.map((s) => {
                const pct = leadsData.total > 0 ? Math.round((s.count / leadsData.total) * 100) : 0;
                const colors = getStageColor(s.stageName);
                return (
                  <div key={s.stageName} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className={`font-medium px-2 py-0.5 rounded-md text-xs ${colors.bg} ${colors.text}`}>
                        {s.stageName}
                      </span>
                      <span className="text-slate-500">{s.count} · {pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent leads */}
      <Card className="border-slate-100 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900">Leads Recentes do Google</CardTitle>
        </CardHeader>
        <CardContent>
          {leadsData.recentLeads.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Nenhum lead do Google ainda</p>
          ) : (
            <div className="space-y-2">
              {leadsData.recentLeads.map((lead) => {
                const stageColors = lead.stageName ? getStageColor(lead.stageName) : null;
                return (
                  <div key={lead.id} className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-amber-700">
                          {lead.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{lead.name}</p>
                        <p className="text-[10px] text-slate-400">{lead.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {lead.campaign && (
                        <span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded-md">
                          {lead.campaign}
                        </span>
                      )}
                      {lead.stageName && stageColors && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${stageColors.bg} ${stageColors.text}`}>
                          {lead.stageName}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {new Date(lead.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* GA Integration info */}
      {!hasGAConfig && (
        <Card className="border-amber-100 bg-amber-50/30 rounded-2xl shadow-sm">
          <CardContent className="py-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <SearchIcon className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900">Configure o Google Analytics</p>
                <p className="text-xs text-amber-700/70 mt-1">
                  Adicione o Measurement ID em Configurações para rastrear automaticamente
                  a origem dos leads vindos do Google Ads.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Google Meu Negócio Tab ───

function GoogleBusinessTab() {
  return (
    <div className="space-y-6">
      {/* Info card */}
      <Card className="border-amber-100 bg-gradient-to-br from-amber-50/50 to-white rounded-2xl shadow-sm">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Store className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">Google Meu Negócio</p>
              <p className="text-sm text-slate-500 mt-1">
                Gerencie a presença do seu negócio no Google diretamente do CRM.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FeatureCard
          icon={MapPin}
          title="Localização & Endereço"
          description="Mantenha seu endereço atualizado para clientes encontrarem você facilmente no Google Maps."
          color="text-red-500"
          bg="bg-red-50"
        />
        <FeatureCard
          icon={Clock}
          title="Horário de Funcionamento"
          description="Defina seus horários de atendimento, feriados e horários especiais."
          color="text-blue-500"
          bg="bg-blue-50"
        />
        <FeatureCard
          icon={Star}
          title="Avaliações & Respostas"
          description="Acompanhe avaliações dos clientes e responda diretamente daqui."
          color="text-amber-500"
          bg="bg-amber-50"
        />
        <FeatureCard
          icon={Phone}
          title="Informações de Contato"
          description="Telefone, site, WhatsApp e todas as formas de contato do seu negócio."
          color="text-emerald-500"
          bg="bg-emerald-50"
        />
        <FeatureCard
          icon={Globe}
          title="Posts & Novidades"
          description="Publique novidades, ofertas e eventos diretamente no seu perfil do Google."
          color="text-violet-500"
          bg="bg-violet-50"
        />
        <FeatureCard
          icon={BarChart2}
          title="Insights & Métricas"
          description="Visualizações do perfil, cliques, ligações e pedidos de rota."
          color="text-indigo-500"
          bg="bg-indigo-50"
        />
      </div>

      {/* Connect CTA */}
      <Card className="border-slate-100 rounded-2xl shadow-sm">
        <CardContent className="py-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto">
            <Store className="h-8 w-8 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Integração em desenvolvimento</p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              A integração com o Google Business Profile API está sendo preparada.
              Em breve você poderá gerenciar tudo por aqui.
            </p>
          </div>
          <a
            href="https://business.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:text-amber-800 transition-colors"
          >
            Abrir Google Meu Negócio
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
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
