"use client";

import { X, Trash2 } from "lucide-react";
import type { CanvasNode } from "./WorkflowNode";

type Props = {
  node: CanvasNode;
  stages: { id: string; name: string }[];
  onUpdate: (config: Record<string, unknown>) => void;
  onClose: () => void;
  onDelete: () => void;
};

export function NodeConfigPanel({ node, stages, onUpdate, onClose, onDelete }: Props) {
  const config = node.config || {};

  const updateField = (key: string, value: unknown) => {
    onUpdate({ ...config, [key]: value });
  };

  return (
    <div className="w-72 bg-white border-l border-slate-200 flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800 truncate">{node.label}</h3>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Type badge */}
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              node.type === "trigger"
                ? "bg-violet-100 text-violet-700"
                : node.type === "condition"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-teal-100 text-teal-700"
            }`}
          >
            {node.type === "trigger" ? "Gatilho" : node.type === "condition" ? "Condicao" : "Acao"}
          </span>
          <span className="text-xs text-slate-400">{node.subtype}</span>
        </div>

        {/* Trigger configs */}
        {node.subtype === "stage_change" && (
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Etapa</label>
            <select
              value={(config.stageId as string) || ""}
              onChange={(e) => updateField("stageId", e.target.value)}
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-300"
            >
              <option value="">Selecionar etapa</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {node.subtype === "tag_added" && (
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Tag</label>
            <input
              type="text"
              value={(config.tag as string) || ""}
              onChange={(e) => updateField("tag", e.target.value)}
              placeholder="Nome da tag"
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-300"
            />
          </div>
        )}

        {/* Condition configs */}
        {node.subtype === "tag_check" && (
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Tag a verificar</label>
            <input
              type="text"
              value={(config.tag as string) || ""}
              onChange={(e) => updateField("tag", e.target.value)}
              placeholder="Nome da tag"
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-300"
            />
          </div>
        )}

        {node.subtype === "stage_check" && (
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              Etapa a verificar
            </label>
            <select
              value={(config.stageId as string) || ""}
              onChange={(e) => updateField("stageId", e.target.value)}
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-300"
            >
              <option value="">Selecionar</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Action configs */}
        {node.subtype === "send_whatsapp" && (
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Mensagem</label>
            <textarea
              value={(config.message as string) || ""}
              onChange={(e) => updateField("message", e.target.value)}
              placeholder="Ola {{nome}}! ..."
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-300 resize-none h-24"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Variaveis: {"{{nome}}"}, {"{{clinica}}"}
            </p>
          </div>
        )}

        {node.subtype === "move_stage" && (
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Mover para</label>
            <select
              value={(config.stageId as string) || ""}
              onChange={(e) => updateField("stageId", e.target.value)}
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-300"
            >
              <option value="">Selecionar etapa</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {(node.subtype === "add_tag" || node.subtype === "remove_tag") && (
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Tag</label>
            <input
              type="text"
              value={(config.tag as string) || ""}
              onChange={(e) => updateField("tag", e.target.value)}
              placeholder="Nome da tag"
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-300"
            />
          </div>
        )}

        {node.subtype === "delay" && (
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              Aguardar (minutos)
            </label>
            <input
              type="number"
              value={(config.minutes as number) || 60}
              onChange={(e) => updateField("minutes", parseInt(e.target.value))}
              min={1}
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-300"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              = {Math.floor(((config.minutes as number) || 60) / 60)}h{" "}
              {((config.minutes as number) || 60) % 60}min
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100">
        <button
          onClick={onDelete}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" /> Excluir no
        </button>
      </div>
    </div>
  );
}
