"use client";

import { Search } from "lucide-react";

export function SearchButton() {
  const handleClick = () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
  };

  return (
    <button
      onClick={handleClick}
      className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
    >
      <Search className="h-3.5 w-3.5" />
      <span className="text-xs">Buscar</span>
      <kbd className="ml-1 rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[10px]">
        Ctrl+K
      </kbd>
    </button>
  );
}
