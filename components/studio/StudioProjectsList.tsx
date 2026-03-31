"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, Plus, Trash2, MessageCircle, Image } from "lucide-react";
import { toast } from "sonner";
import { createStudioProject, deleteStudioProject } from "@/app/actions/studioChat";

type Project = { id: string; title: string; type: string; status: string; createdAt: Date; _count: { chatMessages: number; posts: number } };

export function StudioProjectsList({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    const result = await createStudioProject({ title: title.trim() });
    setCreating(false);
    if (result.success && result.data) {
      router.push(`/dashboard/studio/chat?project=${result.data.id}`);
    } else toast.error("Erro ao criar projeto");
  };

  const handleDelete = async (id: string) => {
    await deleteStudioProject(id);
    toast.success("Projeto excluido");
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 text-sm">Projetos ({projects.length})</h3>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> Novo Projeto
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center">
          <Clapperboard className="h-12 w-12 text-slate-200 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-900 mb-1">Nenhum projeto</h3>
          <p className="text-sm text-slate-400">Crie um projeto para comecar a produzir conteudo com IA</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {projects.map((p) => (
            <div key={p.id} onClick={() => router.push(`/dashboard/studio/chat?project=${p.id}`)}
              className="bg-white border border-slate-100 rounded-xl p-4 hover:shadow-sm cursor-pointer group">
              <div className="flex items-start justify-between">
                <h4 className="font-medium text-slate-900 text-sm truncate flex-1">{p.title}</h4>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                  className="h-7 w-7 rounded-lg hover:bg-red-50 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
                </button>
              </div>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{p._count.chatMessages} msgs</span>
                <span className="flex items-center gap-1"><Image className="h-3 w-3" />{p._count.posts} posts</span>
                <span className={`px-1.5 py-0.5 rounded-full ${p.status === "completed" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                  {p.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-3">
            <h3 className="font-semibold text-slate-900">Novo Projeto</h3>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder='Ex: "Campanha de inverno" ou "Reels sobre botox"'
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <div className="flex gap-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600">Cancelar</button>
              <button onClick={handleCreate} disabled={creating || !title.trim()}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {creating ? "Criando..." : "Criar e Abrir Chat"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
