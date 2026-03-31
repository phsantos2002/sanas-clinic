"use client";

import { useState } from "react";
import { FolderOpen, Plus, Trash2, Upload, User, Building, Syringe, Palette, Bookmark, X } from "lucide-react";
import { toast } from "sonner";
import { createAsset, deleteAsset, type AssetData } from "@/app/actions/vault";

const CATEGORIES = [
  { id: "person", label: "Pessoas", icon: User, color: "bg-blue-50 text-blue-600" },
  { id: "space", label: "Espaco", icon: Building, color: "bg-green-50 text-green-600" },
  { id: "procedure", label: "Procedimentos", icon: Syringe, color: "bg-violet-50 text-violet-600" },
  { id: "brand", label: "Marca", icon: Palette, color: "bg-amber-50 text-amber-600" },
  { id: "reference", label: "Referencias", icon: Bookmark, color: "bg-slate-50 text-slate-600" },
];

export function VaultClient({ assets, stats }: { assets: AssetData[]; stats: Record<string, number> | null }) {
  const [filter, setFilter] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("person");
  const [newDescription, setNewDescription] = useState("");
  const [newPersonName, setNewPersonName] = useState("");
  const [newIsFace, setNewIsFace] = useState(false);
  const [newIsVoice, setNewIsVoice] = useState(false);
  const [fileUrl, setFileUrl] = useState("");

  const filtered = filter ? assets.filter((a) => a.category === filter) : assets;

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFileUrl(data.url);
      if (!newName) setNewName(file.name.split(".")[0]);
      toast.success("Arquivo enviado!");
    } catch { toast.error("Erro no upload"); }
    setUploading(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const result = await createAsset({
      category: newCategory, name: newName.trim(), description: newDescription.trim() || undefined,
      fileUrl: fileUrl || undefined, fileType: fileUrl ? "image" : undefined,
      isFaceReference: newIsFace, isVoiceSample: newIsVoice,
      personName: newPersonName.trim() || undefined,
    });
    if (result.success) {
      toast.success("Asset adicionado ao acervo!");
      setShowUpload(false); setNewName(""); setNewDescription(""); setFileUrl("");
      window.location.reload();
    } else toast.error(result.success ? "Erro" : result.error);
  };

  const handleDelete = async (id: string) => {
    await deleteAsset(id);
    toast.success("Asset removido");
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-5 gap-2">
        {CATEGORIES.map((cat) => (
          <button key={cat.id} onClick={() => setFilter(filter === cat.id ? null : cat.id)}
            className={`p-3 rounded-xl text-center transition-all ${filter === cat.id ? "ring-2 ring-indigo-400" : ""} ${cat.color}`}>
            <cat.icon className="h-5 w-5 mx-auto mb-1" />
            <p className="text-lg font-bold">{stats?.[cat.id] || 0}</p>
            <p className="text-[10px]">{cat.label}</p>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 text-sm">
          {filter ? CATEGORIES.find((c) => c.id === filter)?.label : "Todos os Assets"} ({filtered.length})
        </h3>
        <button onClick={() => setShowUpload(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      </div>

      {/* Assets grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center">
          <FolderOpen className="h-12 w-12 text-slate-200 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-900 mb-1">Acervo vazio</h3>
          <p className="text-sm text-slate-400">Adicione fotos, informacoes de procedimentos e assets da marca</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((asset) => {
            const cat = CATEGORIES.find((c) => c.id === asset.category);
            return (
              <div key={asset.id} className="bg-white border border-slate-100 rounded-xl overflow-hidden group">
                {asset.fileUrl ? (
                  <div className="h-32 bg-slate-50 relative">
                    {asset.fileType?.startsWith("image") || asset.fileUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                      <img src={asset.fileUrl} alt={asset.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Upload className="h-8 w-8 text-slate-200" />
                      </div>
                    )}
                    <button onClick={() => handleDelete(asset.id)}
                      className="absolute top-1 right-1 h-6 w-6 bg-white/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </button>
                  </div>
                ) : (
                  <div className="h-32 bg-slate-50 flex items-center justify-center relative">
                    {cat && <cat.icon className="h-8 w-8 text-slate-200" />}
                    <button onClick={() => handleDelete(asset.id)}
                      className="absolute top-1 right-1 h-6 w-6 bg-white/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </button>
                  </div>
                )}
                <div className="p-2">
                  <p className="text-xs font-medium text-slate-900 truncate">{asset.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${cat?.color || "bg-slate-50"}`}>{cat?.label}</span>
                    {asset.isFaceReference && <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">Rosto</span>}
                    {asset.isVoiceSample && <span className="text-[9px] bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded-full">Voz</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Adicionar ao Acervo</h3>
              <button onClick={() => setShowUpload(false)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm">
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>

            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome do asset"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />

            <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={2}
              placeholder="Descricao (a IA usa isso como contexto)"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />

            {(newCategory === "person") && (
              <div className="space-y-2">
                <input type="text" value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)}
                  placeholder="Nome da pessoa (ex: Dra. Marina)"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input type="checkbox" checked={newIsFace} onChange={(e) => setNewIsFace(e.target.checked)} className="rounded" />
                    Referencia de rosto
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input type="checkbox" checked={newIsVoice} onChange={(e) => setNewIsVoice(e.target.checked)} className="rounded" />
                    Amostra de voz
                  </label>
                </div>
              </div>
            )}

            {/* File upload */}
            <div>
              {fileUrl ? (
                <div className="flex items-center gap-2 bg-green-50 rounded-xl p-2">
                  <img src={fileUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  <span className="text-xs text-green-700 flex-1">Arquivo enviado</span>
                  <button onClick={() => setFileUrl("")} className="text-xs text-red-500">Remover</button>
                </div>
              ) : (
                <label className="block border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-slate-300">
                  <input type="file" accept="image/*,audio/*,video/*" className="hidden"
                    onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }} />
                  {uploading ? (
                    <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                      <p className="text-xs text-slate-400">Clique para enviar foto, audio ou video</p>
                    </>
                  )}
                </label>
              )}
            </div>

            <button onClick={handleCreate} disabled={!newName.trim()}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              Adicionar ao Acervo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
