"use client";

import { DollarSign } from "lucide-react";

type CostLog = {
  operation: string;
  provider: string;
  model: string | null;
  costUsd: number | null;
  createdAt: Date;
};

const OP_LABELS: Record<string, string> = {
  story_script: "Roteiro",
  story_script_chat: "Chat roteiro",
  story_character: "Personagem",
  story_frame: "Frame storyboard",
  story_video_clip: "Video clip",
  story_caption: "Caption",
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  fal: "Fal.ai",
  replicate: "Replicate",
  kling: "Kling AI",
};

export function CostBreakdown({ costs, storyTitle }: { costs: CostLog[]; storyTitle: string }) {
  const totalUsd = costs.reduce((sum, c) => sum + (c.costUsd || 0), 0);
  const totalBrl = totalUsd * 5.8;

  const byOperation = new Map<string, { count: number; cost: number }>();
  for (const c of costs) {
    const entry = byOperation.get(c.operation) || { count: 0, cost: 0 };
    entry.count++;
    entry.cost += c.costUsd || 0;
    byOperation.set(c.operation, entry);
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold text-slate-900 text-sm">Custos de IA — {storyTitle}</h3>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-slate-900">R$ {totalBrl.toFixed(2)}</p>
          <p className="text-[10px] text-slate-400">US$ {totalUsd.toFixed(4)}</p>
        </div>
      </div>

      {/* Summary by operation */}
      <div className="p-4 border-b border-slate-50 bg-slate-50">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Array.from(byOperation.entries()).map(([op, data]) => (
            <div key={op} className="bg-white rounded-lg p-2.5 text-center">
              <p className="text-xs text-slate-400">{OP_LABELS[op] || op}</p>
              <p className="text-sm font-bold text-slate-900">{data.count}x</p>
              <p className="text-[10px] text-green-600">R$ {(data.cost * 5.8).toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="p-3 font-medium">Operacao</th>
              <th className="p-3 font-medium">Provider</th>
              <th className="p-3 font-medium">Modelo</th>
              <th className="p-3 font-medium text-right">Custo</th>
            </tr>
          </thead>
          <tbody>
            {costs.map((cost, i) => (
              <tr key={i} className="border-b border-slate-50">
                <td className="p-3 text-slate-700">{OP_LABELS[cost.operation] || cost.operation}</td>
                <td className="p-3 text-slate-500">{PROVIDER_LABELS[cost.provider] || cost.provider}</td>
                <td className="p-3 text-slate-400 text-xs">{cost.model || "—"}</td>
                <td className="p-3 text-right font-medium text-green-700">
                  R$ {((cost.costUsd || 0) * 5.8).toFixed(2)}
                </td>
              </tr>
            ))}
            {costs.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-slate-400">Nenhum custo registrado</td>
              </tr>
            )}
          </tbody>
          {costs.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 font-semibold">
                <td colSpan={3} className="p-3 text-slate-700">Total</td>
                <td className="p-3 text-right text-green-700">R$ {totalBrl.toFixed(2)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
