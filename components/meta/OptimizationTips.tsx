"use client";

import {
  Lightbulb, TrendingUp, TrendingDown, Activity,
  DollarSign, MousePointerClick, Target, TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmt, fmtBrl, type MetaCampaignFull, type MetaCampaignInsights } from "./shared";

type Props = {
  campaign: MetaCampaignFull;
  insights: MetaCampaignInsights | null;
};

type Tip = {
  icon: LucideIcon;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
};

export function OptimizationTips({ campaign, insights }: Props) {
  const tips: Tip[] = [];

  if (campaign.ctr < 0.5) {
    tips.push({
      icon: TrendingDown,
      title: "CTR abaixo de 0.5%",
      description: "O público não está engajando com os criativos. Teste novos formatos (carrossel, vídeo curto), copy mais direta e CTAs claros. Mude a primeira imagem ou os 3 primeiros segundos do vídeo.",
      priority: "high",
    });
  } else if (campaign.ctr < 1.0) {
    tips.push({
      icon: Activity,
      title: "CTR pode melhorar",
      description: "Teste variações de copy e headline. Crie versões com prova social (depoimentos, antes/depois). Considere vídeos com ganchos nos primeiros 3 segundos.",
      priority: "medium",
    });
  }

  if (campaign.cpm > 50) {
    tips.push({
      icon: DollarSign,
      title: "CPM muito alto",
      description: "O custo para alcançar 1.000 pessoas está elevado. Pode indicar público saturado ou concorrência alta. Teste expandir o público ou segmentos diferentes.",
      priority: "high",
    });
  }

  if (campaign.cpc > 5) {
    tips.push({
      icon: MousePointerClick,
      title: "CPC elevado",
      description: "Cada clique está caro. Melhore a relevância dos criativos para o público, teste CTAs diferentes e considere ajustar o bid cap do conjunto.",
      priority: "medium",
    });
  }

  const frequency = campaign.impressions > 0 && campaign.reach > 0
    ? campaign.impressions / campaign.reach
    : 0;

  if (frequency > 3) {
    tips.push({
      icon: TriangleAlert,
      title: `Frequência alta (${fmt(frequency, 1)}x)`,
      description: "O público já viu os anúncios muitas vezes. Adicione novos criativos para manter o interesse ou expanda o público-alvo.",
      priority: "high",
    });
  }

  if (insights) {
    const leads = insights.actions["lead"] ?? insights.actions["onsite_conversion.lead_grouped"] ?? 0;
    const costPerLead = insights.costPerAction["lead"] ?? insights.costPerAction["onsite_conversion.lead_grouped"] ?? 0;

    if (leads > 0 && costPerLead > 0) {
      tips.push({
        icon: Target,
        title: `Custo por Lead: ${fmtBrl(costPerLead)}`,
        description: leads > 10
          ? "Volume bom de leads. Foque em criativos que convertem melhor e pause os com custo por lead acima da média."
          : "Poucos leads ainda. Teste landing pages diferentes e criativos com mais urgência ou escassez.",
        priority: leads > 10 ? "low" : "medium",
      });
    }
  }

  if (tips.length === 0) {
    tips.push({
      icon: TrendingUp,
      title: "Campanha com boa performance",
      description: "Métricas saudáveis. Continue testando variações de criativos para manter a performance e evitar saturação do público.",
      priority: "low",
    });
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  tips.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const priorityColors = {
    high: "border-l-red-400",
    medium: "border-l-amber-400",
    low: "border-l-emerald-400",
  };

  return (
    <Card className="border-slate-100 rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Estratégia de Criativos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-slate-400">
          Recomendações baseadas nos insights dos últimos 30 dias para orientar a criação e gestão de novos criativos.
        </p>
        {tips.map((tip, i) => (
          <div key={i} className={`bg-slate-50 rounded-xl p-3 border-l-4 ${priorityColors[tip.priority]}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <tip.icon className="h-3.5 w-3.5 text-slate-600" />
              <p className="text-xs font-semibold text-slate-800">{tip.title}</p>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">{tip.description}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
