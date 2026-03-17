/**
 * Textos contextuais para os termômetros de cada métrica.
 * Variam por status (good/average/bad) e por objetivo de campanha.
 */

import type { MetricStatus, BenchmarkMetrics } from "./benchmarks";

type MetricKey = keyof BenchmarkMetrics;

// ─── Textos genéricos por métrica e status ───

const GENERIC_TEXTS: Record<MetricKey, Record<MetricStatus, string>> = {
  ctr: {
    good: "CTR excelente — seus criativos estão gerando alto engajamento. Mantenha a rotação de criativos para evitar saturação.",
    average: "CTR na média — teste novos formatos (carrossel, vídeo curto) e headlines mais diretas para melhorar.",
    bad: "CTR abaixo do ideal — revise o público-alvo e os criativos. Teste ganchos diferentes nos primeiros 3 segundos.",
  },
  cpm: {
    good: "CPM competitivo — bom custo de alcance. O público está respondendo bem à segmentação.",
    average: "CPM mediano — considere expandir o público ou testar horários diferentes de veiculação.",
    bad: "CPM elevado — público saturado ou concorrência alta. Expanda a segmentação ou renove os criativos.",
  },
  cpc: {
    good: "CPC baixo — ótima relação custo/clique. Considere escalar com cuidado mantendo esse nível.",
    average: "CPC na média — melhore a relevância dos criativos e teste CTAs mais diretas.",
    bad: "CPC alto — os criativos não estão convertendo cliques eficientemente. Revise copy, imagem e CTA.",
  },
  cpl: {
    good: "CPL excelente — custo por lead eficiente. Mantenha a otimização e considere escalar.",
    average: "CPL mediano — otimize a landing page e teste formulários mais curtos.",
    bad: "CPL elevado — revise o funil completo: criativo → landing page → formulário.",
  },
  frequency: {
    good: "Frequência saudável — o público ainda não saturou. Continue monitorando.",
    average: "Frequência subindo — prepare novos criativos para substituição em breve.",
    bad: "Frequência muito alta — o público está saturado. Troque criativos urgentemente ou expanda o público.",
  },
};

// ─── Textos específicos por objetivo ───

const OBJECTIVE_TEXTS: Record<string, Partial<Record<MetricKey, Partial<Record<MetricStatus, string>>>>> = {
  MESSAGES: {
    ctr: {
      good: "CTR alto para mensagens — boa conversão de visualizações em conversas. O criativo está gerando interesse.",
      bad: "CTR baixo para mensagens — teste CTAs como 'Fale conosco no WhatsApp' ou 'Tire suas dúvidas agora'.",
    },
    cpc: {
      good: "CPC baixo — cada conversa está saindo barata. Ideal para escalar volume de atendimento.",
      bad: "CPC alto para mensagens — refine o público para pessoas com maior intenção de contato.",
    },
  },
  CONVERSIONS: {
    ctr: {
      bad: "CTR baixo para conversões — o público pode não estar alinhado com a oferta. Revise a segmentação.",
    },
    cpc: {
      bad: "CPC alto para conversões — otimize a jornada: criativo → landing page → checkout/formulário.",
    },
  },
  LEADS: {
    ctr: {
      good: "CTR alto para leads — formulário/landing page deve estar convertendo bem. Monitore a qualidade dos leads.",
    },
    cpl: {
      bad: "CPL alto — teste formulários nativos do Facebook ou simplifique os campos obrigatórios.",
    },
  },
  TRAFFIC: {
    cpc: {
      good: "CPC muito baixo — tráfego abundante e barato. Verifique se a qualidade do tráfego é boa (tempo no site, bounce rate).",
      bad: "CPC alto para tráfego — o objetivo deveria gerar cliques baratos. Revise criativos e segmentação.",
    },
  },
  ENGAGEMENT: {
    ctr: {
      good: "CTR alto — conteúdo gerando muito engajamento. Use esse aprendizado para outros criativos.",
    },
    cpm: {
      good: "CPM baixo — engajamento barato. Ideal para awareness e construção de audiência.",
    },
  },
  SALES: {
    cpc: {
      bad: "CPC alto para vendas — considere ROAS mínimo ou Cost Cap para controlar o custo por compra.",
    },
    cpl: {
      bad: "Custo por venda elevado — revise o catálogo, preços e a experiência de checkout.",
    },
  },
};

// ─── Textos específicos por estratégia de lance ───

const STRATEGY_TEXTS: Record<string, Partial<Record<MetricKey, Partial<Record<MetricStatus, string>>>>> = {
  COST_CAP: {
    cpc: {
      bad: "CPC acima do Cost Cap configurado. A Meta vai reduzir entrega automaticamente. Aumente o cap em 10-20% ou melhore criativos.",
      average: "CPC próximo do limite do Cost Cap. Monitore — se subir mais, a entrega pode cair.",
      good: "CPC bem abaixo do Cost Cap. Boa margem para manter ou até reduzir o cap gradualmente.",
    },
    cpm: {
      bad: "CPM elevado com Cost Cap — o custo por mil impressões está corroendo seu orçamento. Expanda o público ou renove criativos.",
    },
    frequency: {
      bad: "Frequência alta com Cost Cap — público saturado está encarecendo cada resultado. Renove criativos urgentemente.",
    },
  },
  BID_CAP: {
    cpc: {
      bad: "CPC alto com Bid Cap ativo. Seu lance pode estar baixo demais, limitando a entrega. Aumente o bid gradualmente em 10-15%.",
      average: "CPC no limite do Bid Cap. Você está competindo no limite — considere um leve aumento para manter volume.",
      good: "CPC abaixo do lance máximo — boa folga no Bid Cap. A entrega deve estar fluindo bem.",
    },
    cpm: {
      bad: "CPM alto com Bid Cap — o mercado está caro para esse público. Considere expandir a segmentação.",
    },
    ctr: {
      bad: "CTR baixo com Bid Cap ativo — criativos fracos + bid limitado = entrega muito restrita. Priorize melhorar criativos.",
    },
  },
  ROAS_MIN: {
    cpc: {
      bad: "CPC elevado impacta diretamente o ROAS. Foque em criativos com maior taxa de conversão para compensar.",
      good: "CPC baixo favorece um ROAS mais alto — cada clique é barato, maximizando o retorno.",
    },
    cpm: {
      bad: "CPM alto com meta de ROAS — seu custo de alcance está alto. Isso dificulta atingir o retorno mínimo.",
    },
    ctr: {
      bad: "CTR baixo com ROAS Mínimo — poucos cliques = menos conversões = ROAS em risco. Melhore criativos urgentemente.",
      good: "CTR alto favorece o ROAS — mais cliques por impressão = mais chances de conversão.",
    },
  },
  LOWEST_COST: {
    cpc: {
      bad: "CPC alto no modo Menor Custo — sem cap, a Meta está gastando livremente. Considere migrar para Cost Cap para controlar.",
    },
    cpm: {
      bad: "CPM elevado sem limite de custo — o público pode estar saturado. Expanda a segmentação ou renove criativos.",
    },
    frequency: {
      bad: "Frequência alta no Menor Custo — sem limite, a Meta repete para o mesmo público. Troque criativos ou considere Bid Cap.",
    },
  },
};

/**
 * Retorna o texto contextual para uma métrica + status + objetivo + estratégia.
 * Prioridade: estratégia > objetivo > genérico.
 */
export function getThermometerText(
  metric: MetricKey,
  status: MetricStatus,
  objective?: string | null,
  bidStrategy?: string | null
): string {
  // Strategy-specific text takes priority
  if (bidStrategy) {
    const stratText = STRATEGY_TEXTS[bidStrategy]?.[metric]?.[status];
    if (stratText) return stratText;
  }
  if (objective) {
    const objText = OBJECTIVE_TEXTS[objective]?.[metric]?.[status];
    if (objText) return objText;
  }
  return GENERIC_TEXTS[metric][status];
}

/**
 * Retorna um label curto para o status.
 */
export function getStatusLabel(status: MetricStatus): string {
  switch (status) {
    case "good": return "Ótimo";
    case "average": return "Regular";
    case "bad": return "Fraco";
  }
}
