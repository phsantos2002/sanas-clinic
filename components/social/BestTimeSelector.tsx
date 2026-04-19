"use client";

import { useState } from "react";
import { Sparkles, Clock } from "lucide-react";
import { suggestBestPostTime } from "@/app/actions/social";

type Props = {
  platform: string;
  onSelect: (datetime: string) => void;
};

export function BestTimeSelector({ platform, onSelect }: Props) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<{
    day: string;
    hour: string;
    reason: string;
  } | null>(null);

  const handleSuggest = async () => {
    setLoading(true);
    const data = await suggestBestPostTime(platform);
    if (data) {
      setSuggestion(data);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleSuggest}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-lg hover:bg-indigo-100 transition-colors"
      >
        <Sparkles className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Analisando..." : "Sugerir melhor horario"}
      </button>

      {suggestion && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-200">
          <Clock className="h-4 w-4 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-medium text-emerald-800">
              {suggestion.day} as {suggestion.hour}
            </p>
            <p className="text-[10px] text-emerald-600">{suggestion.reason}</p>
          </div>
          <button
            onClick={() => onSelect(`${suggestion.day}T${suggestion.hour}`)}
            className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-medium rounded hover:bg-emerald-700"
          >
            Usar
          </button>
        </div>
      )}
    </div>
  );
}
