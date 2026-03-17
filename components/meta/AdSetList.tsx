"use client";

import { useState, useTransition } from "react";
import {
  ChevronDown, ChevronRight, Plus, AlertCircle, Info,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  updateAdSetBidCap,
  getMetaAds,
  type MetaAdSet,
  type MetaAd,
} from "@/app/actions/meta";
import { fmtBrl, getCreativeHealth } from "./shared";
import { AdCard } from "./AdCard";
import { CreateAdModal } from "./CreateAdModal";
import type { BenchmarkMetrics } from "@/lib/benchmarks";

type Props = {
  adSet: MetaAdSet;
  campaignCpc: number;
  campaignCpm: number;
  benchmark?: BenchmarkMetrics | null;
};

export function AdSetItem({ adSet, campaignCpc, campaignCpm, benchmark }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [ads, setAds] = useState<MetaAd[]>([]);
  const [loadingAds, setLoadingAds] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [editBidCap, setEditBidCap] = useState(false);
  const [bidValue, setBidValue] = useState(adSet.bidAmount?.toString() ?? "");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const isActive = adSet.status === "ACTIVE";

  const suggestedBidMin = campaignCpc > 0 ? Math.max(0.01, campaignCpc * 0.8) : null;
  const suggestedBidMax = campaignCpc > 0 ? campaignCpc * 1.5 : null;

  async function handleExpand() {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (ads.length === 0) {
      setLoadingAds(true);
      const fetchedAds = await getMetaAds(adSet.id);
      setAds(fetchedAds);
      setLoadingAds(false);
    }
  }

  async function handleSaveBidCap() {
    const val = parseFloat(bidValue);
    if (isNaN(val) || val <= 0) { toast.error("Valor inválido"); return; }
    startTransition(async () => {
      const result = await updateAdSetBidCap(adSet.id, val);
      if (result.success) { toast.success("Bid Cap atualizado"); setEditBidCap(false); }
      else toast.error(result.error);
    });
  }

  const activeAds = ads.filter((a) => a.status === "ACTIVE");
  const performingCount = ads.filter((a) => getCreativeHealth(a) === "performing").length;
  const warningCount = ads.filter((a) => ["saturating", "declining"].includes(getCreativeHealth(a))).length;

  return (
    <div className={`bg-white border rounded-xl overflow-hidden ${isActive ? "border-blue-100" : "border-slate-100"}`}>
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button onClick={handleExpand} className="text-slate-400 hover:text-slate-600">
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">{adSet.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {isActive ? "Ativo" : "Pausado"}
                </span>
                {adSet.optimization_goal && (
                  <span className="text-[10px] text-slate-400">Otimização: {adSet.optimization_goal.replace(/_/g, " ")}</span>
                )}
                {ads.length > 0 && (
                  <span className="text-[10px] text-slate-400">
                    {activeAds.length} ativo{activeAds.length !== 1 ? "s" : ""}
                    {warningCount > 0 && <span className="text-amber-500 ml-1">({warningCount} atenção)</span>}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <p className="text-[10px] text-slate-400">Bid Cap</p>
              <p className="text-xs font-bold text-slate-900">{adSet.bidAmount != null ? fmtBrl(adSet.bidAmount) : "—"}</p>
            </div>
            {!editBidCap ? (
              <button onClick={() => setEditBidCap(true)} className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium">Editar</button>
            ) : (
              <div className="flex items-center gap-1.5">
                <Input type="number" value={bidValue} onChange={(e) => setBidValue(e.target.value)} className="h-6 w-20 text-[11px] rounded-md" placeholder="R$" />
                <Button size="sm" onClick={handleSaveBidCap} disabled={isPending} className="h-6 text-[10px] rounded-md px-2">OK</Button>
                <button onClick={() => setEditBidCap(false)} className="text-[10px] text-slate-400">&#10005;</button>
              </div>
            )}
          </div>
        </div>

        {/* Bid cap suggestion inline */}
        {editBidCap && suggestedBidMin != null && suggestedBidMax != null && (
          <div className="mt-2 ml-6 flex items-start gap-1.5 text-[10px] text-blue-600 bg-blue-50 rounded-lg px-2.5 py-1.5">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>
              Com base no CPC médio ({fmtBrl(campaignCpc)}), sugerimos um bid entre{" "}
              <span className="font-bold">{fmtBrl(suggestedBidMin)}</span> e{" "}
              <span className="font-bold">{fmtBrl(suggestedBidMax)}</span>.
              Valores abaixo podem limitar entrega; acima aumentam custo sem ganho proporcional.
            </span>
          </div>
        )}

        {/* Bid cap vs CPC real alert */}
        {!editBidCap && adSet.bidAmount != null && campaignCpc > 0 && (() => {
          const ratio = adSet.bidAmount! / campaignCpc;
          if (ratio < 0.7) return (
            <div className="mt-2 ml-6 flex items-start gap-1.5 text-[10px] text-red-600 bg-red-50 rounded-lg px-2.5 py-1.5">
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>
                Bid Cap ({fmtBrl(adSet.bidAmount!)}) está <span className="font-bold">{Math.round((1 - ratio) * 100)}% abaixo</span> do CPC real ({fmtBrl(campaignCpc)}).
                A entrega pode estar sendo limitada. Considere aumentar para pelo menos {fmtBrl(campaignCpc * 0.8)}.
              </span>
            </div>
          );
          if (ratio > 2) return (
            <div className="mt-2 ml-6 flex items-start gap-1.5 text-[10px] text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5">
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>
                Bid Cap ({fmtBrl(adSet.bidAmount!)}) está <span className="font-bold">{Math.round((ratio - 1) * 100)}% acima</span> do CPC real ({fmtBrl(campaignCpc)}).
                Você pode estar pagando mais do que necessário. Considere reduzir para {fmtBrl(campaignCpc * 1.3)}.
              </span>
            </div>
          );
          return (
            <div className="mt-2 ml-6 flex items-start gap-1.5 text-[10px] text-emerald-600 bg-emerald-50 rounded-lg px-2.5 py-1.5">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>Bid Cap alinhado com o CPC real. Boa configuração.</span>
            </div>
          );
        })()}
      </div>

      {expanded && (
        <div className="border-t border-slate-50 bg-slate-50/30 px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon className="h-3 w-3" /> Criativos / Anúncios
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <Plus className="h-3 w-3" /> Adicionar criativo
            </button>
          </div>

          {loadingAds ? (
            <p className="text-[10px] text-slate-400">Carregando...</p>
          ) : ads.length === 0 ? (
            <p className="text-[10px] text-slate-400">Nenhum anúncio encontrado</p>
          ) : (
            <div className="space-y-2">
              {ads.map((ad) => <AdCard key={ad.id} ad={ad} benchmark={benchmark} />)}

              {/* Summary bar */}
              {ads.length > 1 && (
                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400">{ads.length} criativos</span>
                  {performingCount > 0 && <span className="text-[10px] text-emerald-600">{performingCount} performando</span>}
                  {warningCount > 0 && <span className="text-[10px] text-amber-600">{warningCount} precisam de atenção</span>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create Ad Modal */}
      {showCreateModal && (
        <CreateAdModal
          adSetId={adSet.id}
          adSetName={adSet.name}
          onClose={() => setShowCreateModal(false)}
          onCreated={async () => {
            setLoadingAds(true);
            const refreshed = await getMetaAds(adSet.id);
            setAds(refreshed);
            setLoadingAds(false);
          }}
        />
      )}
    </div>
  );
}
