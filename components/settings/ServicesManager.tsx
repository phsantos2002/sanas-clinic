"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Edit3, Clock, DollarSign } from "lucide-react";
import { createService, updateService, deleteService, type ServiceData } from "@/app/actions/services";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any;

const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

export function ServicesManager({ initialServices }: { initialServices: Service[] }) {
  const router = useRouter();
  const [services, setServices] = useState(initialServices);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [duration, setDuration] = useState(60);
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setName(""); setDescription(""); setPrice(0); setDuration(60); setCategory("");
    setShowCreate(false); setEditingId(null);
  };

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Nome obrigatorio"); return; }
    setSaving(true);
    const result = await createService({ name, description, price, duration, category });
    setSaving(false);
    if (result.success) {
      toast.success("Servico criado!");
      resetForm();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const handleUpdate = async (id: string) => {
    setSaving(true);
    const result = await updateService(id, { name, description, price, duration, category });
    setSaving(false);
    if (result.success) {
      toast.success("Servico atualizado!");
      setEditingId(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteService(id);
    if (result.success) {
      setServices(prev => prev.filter((s: Service) => s.id !== id));
      toast.success("Servico removido");
    } else {
      toast.error(result.error);
    }
  };

  const startEdit = (service: Service) => {
    setEditingId(service.id);
    setName(service.name);
    setDescription(service.description || "");
    setPrice(service.price);
    setDuration(service.duration);
    setCategory(service.category || "");
  };

  const formVisible = showCreate || editingId;

  return (
    <div className="space-y-4">
      {services.length === 0 && !showCreate && (
        <div className="text-center py-8 text-slate-400">
          <DollarSign className="h-8 w-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">Nenhum servico cadastrado</p>
          <p className="text-xs mt-1">Cadastre seus servicos para a IA saber precos e duracao</p>
        </div>
      )}

      {services.map((service: Service) => (
        <div key={service.id}>
          {editingId === service.id ? (
            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Nome do servico *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Ex: Botox, Limpeza de Pele..." className={inputClass} autoFocus />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Descricao</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                  placeholder="Descricao do servico..." className={`${inputClass} resize-none`} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Valor (R$)</label>
                  <input type="text" inputMode="decimal" value={price || ""} onChange={e => setPrice(Number(e.target.value.replace(",", ".").replace(/[^\d.]/g, "")) || 0)} placeholder="0,00" className={inputClass} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Duracao (min)</label>
                  <input type="text" inputMode="numeric" value={duration || ""} onChange={e => setDuration(Number(e.target.value.replace(/\D/g, "")) || 0)} placeholder="60" className={inputClass} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Categoria</label>
                  <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="Ex: Estetica" className={inputClass} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={resetForm} className="px-4 py-1.5 text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
                <button onClick={() => handleUpdate(service.id)} disabled={saving}
                  className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? "Salvando..." : "Atualizar"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{service.name}</p>
                  {service.category && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">{service.category}</span>
                  )}
                </div>
                {service.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{service.description}</p>}
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                    <DollarSign className="h-3 w-3" /> R$ {service.price.toFixed(2)}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-blue-600">
                    <Clock className="h-3 w-3" /> {service.duration} min
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => startEdit(service)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDelete(service.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {showCreate && (
        <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Nome do servico *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ex: Botox, Limpeza de Pele..." className={inputClass} autoFocus />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Descricao</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="Descricao do servico..." className={`${inputClass} resize-none`} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Valor (R$)</label>
              <input type="text" inputMode="decimal" value={price || ""} onChange={e => setPrice(Number(e.target.value.replace(",", ".").replace(/[^\d.]/g, "")) || 0)} placeholder="0,00" className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Duracao (min)</label>
              <input type="text" inputMode="numeric" value={duration || ""} onChange={e => setDuration(Number(e.target.value.replace(/\D/g, "")) || 0)} placeholder="60" className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Categoria</label>
              <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="Ex: Estetica" className={inputClass} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={resetForm} className="px-4 py-1.5 text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
            <button onClick={handleCreate} disabled={saving}
              className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Salvando..." : "Criar Servico"}
            </button>
          </div>
        </div>
      )}

      {!showCreate && !editingId && (
        <button onClick={() => { resetForm(); setShowCreate(true); }}
          className="w-full py-2.5 border-2 border-dashed border-slate-200 text-slate-500 text-sm font-medium rounded-xl hover:border-indigo-300 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2">
          <Plus className="h-4 w-4" /> Adicionar Servico
        </button>
      )}
    </div>
  );
}
