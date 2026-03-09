import { getAnalytics } from "@/app/actions/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, TrendingUp, Target, MessageCircle, ArrowRight, Zap, ZapOff } from "lucide-react";
import type { MetaCampaign } from "@/services/metaAds";

function fmt(n: number, dec = 2) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtBrl(n: number) {
  return `R$ ${fmt(n)}`;
}

type Quality = "good" | "ok" | "bad";

function scoreCTR(ctr: number): Quality {
  if (ctr >= 1.5) return "good";
  if (ctr >= 0.5) return "ok";
  return "bad";
}
function scoreCPM(cpm: number): Quality {
  if (cpm <= 20) return "good";
  if (cpm <= 50) return "ok";
  return "bad";
}
function scoreCPC(cpc: number): Quality {
  if (cpc <= 2) return "good";
  if (cpc <= 5) return "ok";
  return "bad";
}

const qualityConfig: Record<Quality, { label: string; color: string; bar: string }> = {
  good: { label: "Ótimo",   color: "text-emerald-600", bar: "bg-emerald-500" },
  ok:   { label: "Regular", color: "text-amber-600",   bar: "bg-amber-400"   },
  bad:  { label: "Fraco",   color: "text-red-500",     bar: "bg-red-400"     },
};

function Thermometer({ label, value, quality }: { label: string; value: string; quality: Quality }) {
  const cfg = qualityConfig[quality];
  const barWidth = quality === "good" ? 100 : quality === "ok" ? 60 : 25;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-500">{label}</span>
        <span className={`font-semibold ${cfg.color}`}>{cfg.label}</span>
      </div>
      <p className="text-lg font-bold leading-none">{value}</p>
      <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
        <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${barWidth}%` }} />
      </div>
    </div>
  );
}

function CampaignCard({ campaign, totalSpend }: { campaign: MetaCampaign; totalSpend: number }) {
  const isActive = campaign.status === "ACTIVE";
  const shareOfSpend = totalSpend > 0 ? Math.round((campaign.spend / totalSpend) * 100) : 0;

  return (
    <Card className={isActive ? "border-blue-200 bg-blue-50/30" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold line-clamp-1">{campaign.name}</CardTitle>
          <span
            className={`shrink-0 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
              isActive ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"
            }`}
          >
            {isActive ? <Zap className="h-3 w-3" /> : <ZapOff className="h-3 w-3" />}
            {isActive ? "Ativa" : "Pausada"}
          </span>
        </div>
        {shareOfSpend > 0 && <p className="text-xs text-zinc-400">{shareOfSpend}% do gasto total</p>}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <p className="text-xs text-zinc-500">Gasto</p>
            <p className="text-base font-bold">{fmtBrl(campaign.spend)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Impressões</p>
            <p className="text-base font-bold">{campaign.impressions.toLocaleString("pt-BR")}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Cliques</p>
            <p className="text-base font-bold">{campaign.clicks.toLocaleString("pt-BR")}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Thermometer label="CTR" value={`${fmt(campaign.ctr)}%`} quality={scoreCTR(campaign.ctr)} />
          <Thermometer label="CPM" value={fmtBrl(campaign.cpm)} quality={scoreCPM(campaign.cpm)} />
          <Thermometer label="CPC" value={fmtBrl(campaign.cpc)} quality={scoreCPC(campaign.cpc)} />
        </div>
      </CardContent>
    </Card>
  );
}

export default async function AnalyticsPage() {
  const data = await getAnalytics();

  if (!data) {
    return <div className="text-center text-zinc-500 py-12">Erro ao carregar métricas.</div>;
  }

  const { pipeline, metaAds, campaigns, hasMetaConfig, metaError, metaNoData } = data;

  const costPerLead = metaAds && pipeline.totalLeads > 0 ? metaAds.spend / pipeline.totalLeads : null;
  const costPerConversation = metaAds && pipeline.leadsWithConversation > 0 ? metaAds.spend / pipeline.leadsWithConversation : null;
  const scheduledCount = pipeline.funnelSteps[3]?.count ?? 0;
  const clientCount = pipeline.funnelSteps[4]?.count ?? 0;
  const costPerScheduled = metaAds && scheduledCount > 0 ? metaAds.spend / scheduledCount : null;
  const costPerClient = metaAds && clientCount > 0 ? metaAds.spend / clientCount : null;

  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE");
  const sortedCampaigns = [...activeCampaigns, ...campaigns.filter((c) => c.status !== "ACTIVE")];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="text-sm text-zinc-500">Funil completo: Meta Ads → WhatsApp → Clientes</p>
      </div>

      {/* Pipeline KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-zinc-500">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pipeline.totalLeads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-zinc-500">Conversas</CardTitle>
            <MessageCircle className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pipeline.leadsWithConversation}</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {pipeline.totalLeads > 0 ? Math.round(pipeline.leadsWithConversation / pipeline.totalLeads * 100) : 0}% dos leads
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-zinc-500">Taxa Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pipeline.conversionRate}%</p>
            <p className="text-xs text-zinc-400 mt-0.5">leads → clientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-zinc-500">Estágios Ativos</CardTitle>
            <Target className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {pipeline.leadsByStage.filter((s) => s.count > 0).length}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">de {pipeline.leadsByStage.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Meta Ads state */}
      {!hasMetaConfig && (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center space-y-1">
            <p className="text-sm font-medium text-zinc-600">Conecte o Meta Ads</p>
            <p className="text-xs text-zinc-400">
              Configure o ID da Conta e o Token em <strong>Configurações → Pixel do Facebook</strong> para ver o desempenho das campanhas aqui.
            </p>
          </CardContent>
        </Card>
      )}

      {hasMetaConfig && metaError && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="py-6 text-center space-y-1">
            <p className="text-sm font-medium text-amber-700">Token do Meta Ads expirado</p>
            <p className="text-xs text-amber-600">
              O token do Graph API Explorer dura apenas 1-2h. Vá em <strong>Configurações → Token de Acesso — Marketing API</strong> e gere um novo token de longa duração.
            </p>
          </CardContent>
        </Card>
      )}

      {hasMetaConfig && metaNoData && (
        <Card className="border-zinc-200 bg-zinc-50/40">
          <CardContent className="py-4 text-center">
            <p className="text-sm text-zinc-500">Nenhum gasto registrado nos últimos 30 dias. Os dados de campanhas aparecem abaixo.</p>
          </CardContent>
        </Card>
      )}

      {/* Account-level summary + quality thermometers */}
      {metaAds && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              Meta Ads — últimos 30 dias (conta)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-5">
              {[
                { label: "Gasto", value: fmtBrl(metaAds.spend) },
                { label: "Impressões", value: metaAds.impressions.toLocaleString("pt-BR") },
                { label: "Cliques", value: metaAds.clicks.toLocaleString("pt-BR") },
                { label: "Alcance", value: metaAds.reach.toLocaleString("pt-BR") },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-zinc-500">{item.label}</p>
                  <p className="text-lg font-bold">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-zinc-100 pt-4">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">Qualidade dos anúncios</p>
              <div className="grid grid-cols-3 gap-6">
                <Thermometer label="CTR médio" value={`${fmt(metaAds.ctr)}%`} quality={scoreCTR(metaAds.ctr)} />
                <Thermometer label="CPM médio" value={fmtBrl(metaAds.cpm)} quality={scoreCPM(metaAds.cpm)} />
                <Thermometer label="CPC médio" value={fmtBrl(metaAds.cpc)} quality={scoreCPC(metaAds.cpc)} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaigns */}
      {campaigns.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">
            Campanhas
            {activeCampaigns.length > 0 && (
              <span className="ml-2 text-xs font-normal text-emerald-600">
                {activeCampaigns.length} ativa{activeCampaigns.length > 1 ? "s" : ""}
              </span>
            )}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {sortedCampaigns.map((c) => (
              <CampaignCard key={c.id} campaign={c} totalSpend={metaAds?.spend ?? 0} />
            ))}
          </div>
        </div>
      )}

      {/* Correlation */}
      {metaAds && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Custo por etapa do funil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Custo por Lead", value: costPerLead, highlight: false },
                { label: "Custo por Conversa", value: costPerConversation, highlight: false },
                { label: "Custo por Agendamento", value: costPerScheduled, highlight: false },
                { label: "Custo por Cliente", value: costPerClient, highlight: true },
              ].map((item) => (
                <div key={item.label} className={`rounded-lg p-3 ${item.highlight ? "bg-blue-50" : "bg-zinc-50"}`}>
                  <p className={`text-xs ${item.highlight ? "text-blue-600" : "text-zinc-500"}`}>{item.label}</p>
                  <p className={`text-lg font-bold ${item.highlight ? "text-blue-700" : ""}`}>
                    {item.value != null ? fmtBrl(item.value) : "—"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Funil completo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pipeline.funnelSteps.map((step, i) => (
            <div key={step.label}>
              <div className="flex items-center justify-between text-sm mb-1">
                <div className="flex items-center gap-1.5">
                  {i > 0 && <ArrowRight className="h-3 w-3 text-zinc-300" />}
                  <span className="font-medium">{step.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">{step.count} · {step.rate}%</span>
                  {metaAds && step.count > 0 && (
                    <span className="text-xs text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">
                      {fmtBrl(metaAds.spend / step.count)}/un
                    </span>
                  )}
                </div>
              </div>
              <Progress value={step.rate} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Leads por estágio */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leads por estágio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pipeline.leadsByStage.map((stage) => (
            <div key={stage.stageId} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">{stage.stageName}</span>
                  <span className="ml-2 text-xs text-zinc-400 font-mono">{stage.eventName}</span>
                </div>
                <span className="text-zinc-500">{stage.count} · {stage.percentage}%</span>
              </div>
              <Progress value={stage.percentage} />
            </div>
          ))}
          {pipeline.totalLeads === 0 && (
            <p className="text-sm text-zinc-500 text-center py-4">Nenhum lead cadastrado ainda.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
