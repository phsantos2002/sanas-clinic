"use client";

import { useState } from "react";
import { Users, RefreshCw, Check, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { generateCharacters, regenerateCharacter, approveAllCharacters } from "@/app/actions/pipeline";

type Character = {
  id: string; name: string; description: string; role: string | null;
  imageUrl: string | null; imageStatus: string; isApproved: boolean;
};

const STATUS_ICON: Record<string, typeof Loader2> = {
  pending: AlertCircle, generating: Loader2, done: Check, error: AlertCircle,
};

export function CharacterGallery({ storyId, characters, status }: {
  storyId: string; characters: Character[]; status: string;
}) {
  const [generating, setGenerating] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    const result = await generateCharacters(storyId);
    setGenerating(false);
    if (result.success) { toast.success("Personagens gerados!"); window.location.reload(); }
    else toast.error(result.success ? "Erro" : result.error);
  };

  const handleRegenerate = async (charId: string) => {
    setRegeneratingId(charId);
    const result = await regenerateCharacter(charId);
    setRegeneratingId(null);
    if (result.success) { toast.success("Regenerado!"); window.location.reload(); }
    else toast.error(result.success ? "Erro" : result.error);
  };

  const handleApproveAll = async () => {
    const result = await approveAllCharacters(storyId);
    if (result.success) { toast.success("Aprovados! Proximo: storyboard."); window.location.reload(); }
  };

  const allDone = characters.length > 0 && characters.every((c) => c.imageStatus === "done");
  const hasPending = characters.some((c) => c.imageStatus === "pending");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-violet-600" />
          <h3 className="font-semibold text-slate-900 text-sm">Personagens ({characters.length})</h3>
        </div>
        <div className="flex gap-2">
          {hasPending && (
            <button onClick={handleGenerate} disabled={generating}
              className="px-3 py-1.5 bg-violet-600 text-white rounded-xl text-xs font-medium hover:bg-violet-700 disabled:opacity-50">
              {generating ? "Gerando..." : "Gerar Imagens"}
            </button>
          )}
          {allDone && (status === "char_review" || status === "characters") && (
            <button onClick={handleApproveAll}
              className="px-3 py-1.5 bg-green-600 text-white rounded-xl text-xs font-medium hover:bg-green-700 flex items-center gap-1">
              <Check className="h-3 w-3" /> Aprovar Todos e Avancar
            </button>
          )}
        </div>
      </div>

      {characters.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
          <Users className="h-10 w-10 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Gere o roteiro primeiro para extrair os personagens.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((char) => {
            const StatusIcon = STATUS_ICON[char.imageStatus] || AlertCircle;
            return (
              <div key={char.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
                <div className="h-48 bg-slate-50 flex items-center justify-center relative">
                  {char.imageUrl ? (
                    <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" />
                  ) : char.imageStatus === "generating" ? (
                    <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
                  ) : (
                    <Users className="h-8 w-8 text-slate-200" />
                  )}
                  <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    char.imageStatus === "done" ? "bg-green-100 text-green-700" :
                    char.imageStatus === "generating" ? "bg-blue-100 text-blue-700" :
                    char.imageStatus === "error" ? "bg-red-100 text-red-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    <StatusIcon className="h-2.5 w-2.5 inline mr-0.5" />
                    {char.imageStatus}
                  </span>
                </div>
                <div className="p-3">
                  <h4 className="font-medium text-slate-900 text-sm">{char.name}</h4>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{char.description}</p>
                  {char.role && <span className="inline-block text-[10px] bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full mt-1">{char.role}</span>}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleRegenerate(char.id)}
                      disabled={regeneratingId === char.id}
                      className="text-xs text-slate-500 hover:text-violet-600 flex items-center gap-1"
                    >
                      <RefreshCw className={`h-3 w-3 ${regeneratingId === char.id ? "animate-spin" : ""}`} /> Regenerar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
