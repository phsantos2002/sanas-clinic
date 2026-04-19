"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, Trash2, Hash } from "lucide-react";
import { toast } from "sonner";
import {
  createMessageTemplate,
  deleteMessageTemplate,
  type TemplateData,
} from "@/app/actions/whatsappHub";

const CATEGORIES = [
  { value: "saudacao", label: "Saudacao" },
  { value: "follow_up", label: "Follow-up" },
  { value: "agendamento", label: "Agendamento" },
  { value: "promo", label: "Promocao" },
  { value: "geral", label: "Geral" },
];

export function TemplatesClient({ templates }: { templates: TemplateData[] }) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("geral");
  const [shortcut, setShortcut] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !content.trim()) return;
    setCreating(true);
    const result = await createMessageTemplate({
      name: name.trim(),
      content: content.trim(),
      category,
      shortcut: shortcut.trim() || undefined,
    });
    setCreating(false);
    if (result.success) {
      toast.success("Template criado!");
      setShowCreate(false);
      setName("");
      setContent("");
      router.refresh();
    } else toast.error(result.success ? "Erro" : result.error);
  };

  const handleDelete = async (id: string) => {
    await deleteMessageTemplate(id);
    toast.success("Template excluido");
    router.refresh();
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Templates de Mensagem</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Novo Template
        </button>
      </div>

      <p className="text-xs text-slate-400">
        Use {"{{nome}}"} e {"{{clinica}}"} como placeholders. Atalhos como /oi funcionam no chat.
      </p>

      {templates.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
          <FileText className="h-10 w-10 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Nenhum template ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="bg-white border border-slate-100 rounded-xl p-4 flex items-start gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-slate-900 text-sm">{tpl.name}</h4>
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                    {tpl.category}
                  </span>
                  {tpl.shortcut && (
                    <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <Hash className="h-2.5 w-2.5" />
                      {tpl.shortcut}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400">{tpl.usageCount}x usado</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{tpl.content}</p>
              </div>
              <button
                onClick={() => handleDelete(tpl.id)}
                className="h-7 w-7 rounded-lg hover:bg-red-50 flex items-center justify-center"
              >
                <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <h3 className="font-semibold text-slate-900">Novo Template</h3>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome (ex: Saudacao)"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="Ola {{nome}}! Aqui e a {{clinica}}. Como posso ajudar?"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={shortcut}
                onChange={(e) => setShortcut(e.target.value)}
                placeholder="Atalho (ex: /oi)"
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !name.trim() || !content.trim()}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {creating ? "Criando..." : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
