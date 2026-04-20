"use client";

import { Wallet, CreditCard, ExternalLink, AlertTriangle } from "lucide-react";
import type { MetaAccountFinancials } from "@/services/metaAds";

type Props = {
  financials: (MetaAccountFinancials & { adAccountId: string }) | null;
};

const ACCOUNT_STATUS_LABEL: Record<number, string> = {
  1: "Ativa",
  2: "Desativada",
  3: "Em atraso",
  7: "Em revisão de risco",
  8: "Aguardando pagamento",
  9: "Período de tolerância",
  100: "Fechamento pendente",
  101: "Fechada",
};

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "BRL",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function FinancialCard({ financials }: Props) {
  if (!financials) return null;

  const { balance, spendCap, amountSpent, currency, accountStatus, isActive, adAccountId } =
    financials;

  const accountIdClean = adAccountId.replace(/^act_/, "");
  const depositUrl = `https://business.facebook.com/billing_hub/accounts/details?asset_id=${accountIdClean}`;
  const cardUrl = `https://business.facebook.com/billing_hub/payment_settings?asset_id=${accountIdClean}`;

  const statusLabel = ACCOUNT_STATUS_LABEL[accountStatus] ?? `Status ${accountStatus}`;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            <Wallet className="h-4 w-4 text-indigo-600" /> Finanças da conta Meta
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Dados em tempo real da Graph API ·{" "}
            <span className={isActive ? "text-emerald-600" : "text-amber-600"}>{statusLabel}</span>
          </p>
        </div>
      </div>

      {!isActive && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <span className="text-xs text-amber-800">
            Sua conta de anúncios não está ativa. Verifique cobrança e permissões no Meta Ads
            Manager.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Metric
          label="Saldo disponível"
          value={formatMoney(balance, currency)}
          hint="Crédito pré-pago"
        />
        <Metric
          label="Limite de gasto"
          value={spendCap > 0 ? formatMoney(spendCap, currency) : "Sem limite"}
          hint="Teto definido na conta"
        />
        <Metric
          label="Gasto no ciclo"
          value={formatMoney(amountSpent, currency)}
          hint="Total no período atual"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <a
          href={depositUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Wallet className="h-4 w-4" /> Depositar
          <ExternalLink className="h-3 w-3 opacity-80" />
        </a>
        <a
          href={cardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          <CreditCard className="h-4 w-4" /> Gerenciar cartão
          <ExternalLink className="h-3 w-3 opacity-60" />
        </a>
      </div>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[11px] text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{value}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>
    </div>
  );
}
