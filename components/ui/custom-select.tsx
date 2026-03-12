"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

type Option = {
  value: string;
  label: string;
  icon?: React.ReactNode;
};

type Props = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function CustomSelect({ options, value, onChange, placeholder, className }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-9 px-3 text-sm bg-white border border-slate-200 rounded-xl text-slate-700 hover:border-slate-300 transition-colors outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 w-full"
      >
        {selected?.icon}
        <span className="flex-1 text-left truncate">
          {selected?.label ?? placeholder ?? "Selecione..."}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-full min-w-[180px] bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-200/50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors ${
                option.value === value
                  ? "bg-indigo-50 text-indigo-700 font-medium"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {option.icon}
              <span className="flex-1 text-left">{option.label}</span>
              {option.value === value && <Check className="h-3.5 w-3.5 text-indigo-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
