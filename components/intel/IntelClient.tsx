"use client";

import { useState } from "react";
import { Radar, Search, Loader2, Lightbulb, Target, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { runMarketAnalysis } from "@/app/actions/marketIntel";

type AnalysisResult = {
  analysis: string;
  suggestions: string[];
  copyVariations: { angle: string; copies: string[] }[];
  gaps: string[];
  positioning: string;
};

export function IntelClient() {
  const [niche, setNiche] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [focus, setFocus] = useState<"full" | "ads" | "content" | "positioning">("full");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    const res = await runMarketAnalysis({
      niche: niche.trim() || undefined,
      competitors: competitors.trim() ? competitors.split(",").map((c) => c.trim()) : undefined,
      focus,
    });
    setLoading(false);
    if (res.success && res.data) {
      setResult(res.data);
      toast.success("Analise completa!");
    } else toast.error(res.success ? "Erro" : res.error);
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(id);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
          <Radar className="h-5 w-5 text-violet-600" /> Inteligencia de Mercado
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Analise de concorrentes, gaps e oportunidades com IA
        </p>
      </div>

      {/* Input */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Nicho / Setor</label>
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="Ex: clinica estetica, odontologia, salao"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Concorrentes (opcional)
            </label>
            <input
              type="text"
              value={competitors}
              onChange={(e) => setCompetitors(e.target.value)}
              placeholder="Nome1, Nome2, Nome3"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">Foco da analise</label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "full" as const, label: "Completa" },
              { id: "ads" as const, label: "Anuncios" },
              { id: "content" as const, label: "Conteudo" },
              { id: "positioning" as const, label: "Posicionamento" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFocus(f.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  focus === f.id
                    ? "bg-violet-50 text-violet-700 border border-violet-200"
                    : "bg-slate-50 text-slate-500 border border-transparent"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Analisando...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" /> Analisar Mercado
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Analysis */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-violet-500" /> Analise de Mercado
            </h3>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{result.analysis}</p>
          </div>

          {/* Positioning */}
          <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5">
            <h3 className="font-semibold text-violet-900 text-sm mb-2">Posicionamento Sugerido</h3>
            <p className="text-sm text-violet-800">{result.positioning}</p>
          </div>

          {/* Gaps */}
          {result.gaps.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <h3 className="font-semibold text-slate-900 text-sm mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" /> Gaps de Mercado (oportunidades)
              </h3>
              <div className="space-y-2">
                {result.gaps.map((gap, i) => (
                  <div key={i} className="flex items-start gap-2 bg-amber-50 rounded-xl p-3">
                    <span className="text-amber-600 font-bold text-sm">{i + 1}.</span>
                    <p className="text-sm text-amber-800">{gap}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {result.suggestions.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <h3 className="font-semibold text-slate-900 text-sm mb-3">Sugestoes Acionaveis</h3>
              <div className="space-y-2">
                {result.suggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 bg-green-50 rounded-xl p-3">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-green-800">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Copy Variations */}
          {result.copyVariations.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <h3 className="font-semibold text-slate-900 text-sm mb-3 flex items-center gap-2">
                <Copy className="h-4 w-4 text-indigo-500" /> Copies Prontas (3 variacoes por angulo)
              </h3>
              <div className="space-y-4">
                {result.copyVariations.map((cv, ai) => (
                  <div key={ai}>
                    <p className="text-xs font-semibold text-indigo-600 uppercase mb-2">
                      {cv.angle}
                    </p>
                    <div className="space-y-2">
                      {cv.copies.map((copy, ci) => (
                        <div key={ci} className="bg-slate-50 rounded-xl p-3 flex items-start gap-2">
                          <p className="text-sm text-slate-700 flex-1">{copy}</p>
                          <button
                            onClick={() => copyText(copy, `${ai}-${ci}`)}
                            className="shrink-0 h-7 w-7 rounded-lg hover:bg-slate-200 flex items-center justify-center"
                          >
                            {copiedIdx === `${ai}-${ci}` ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-slate-400" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
