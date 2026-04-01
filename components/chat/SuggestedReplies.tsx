"use client";

import { useState, useEffect } from "react";
import { Sparkles, RefreshCw } from "lucide-react";

type Props = {
  lastMessages: { role: string; content: string }[];
  leadName: string;
  onSelect: (text: string) => void;
  visible: boolean;
};

export function SuggestedReplies({ lastMessages, leadName, onSelect, visible }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = async () => {
    if (lastMessages.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/suggest-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: lastMessages.slice(-5),
          leadName,
        }),
      });
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch {
      setSuggestions([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (visible && lastMessages.length > 0) {
      // Only auto-fetch when last message is from the user (lead)
      const lastMsg = lastMessages[lastMessages.length - 1];
      if (lastMsg?.role === "user") {
        fetchSuggestions();
      }
    }
  }, [lastMessages.length, visible]);

  if (!visible || (suggestions.length === 0 && !loading)) return null;

  return (
    <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-slate-400 flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> Sugestoes de resposta
        </span>
        <button
          onClick={fetchSuggestions}
          disabled={loading}
          className="p-0.5 text-slate-400 hover:text-indigo-600 transition-colors"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
      {loading ? (
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-7 w-24 bg-slate-200 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSelect(s)}
              className="shrink-0 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors max-w-[200px] truncate"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
