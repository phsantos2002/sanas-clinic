"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, Trash2, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { createAttendant, deleteAttendant, type AttendantData } from "@/app/actions/whatsappHub";

export function TeamClient({ attendants }: { attendants: AttendantData[] }) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    const result = await createAttendant({ name: name.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined });
    setCreating(false);
    if (result.success) { toast.success("Atendente adicionado!"); setShowCreate(false); setName(""); setEmail(""); setPhone(""); router.refresh(); }
    else toast.error(result.success ? "Erro" : result.error);
  };

  const handleDelete = async (id: string) => {
    await deleteAttendant(id);
    toast.success("Atendente removido");
    router.refresh();
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Equipe de Atendimento</h2>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> Novo Atendente
        </button>
      </div>

      <p className="text-xs text-slate-400">Leads sao atribuidos automaticamente por round-robin (quem tem menos leads recebe o proximo).</p>

      {attendants.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
          <Users className="h-10 w-10 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Nenhum atendente cadastrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {attendants.map((att) => (
            <div key={att.id} className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3">
              <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center">
                <UserCircle className="h-6 w-6 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-slate-900 text-sm">{att.name}</h4>
                <p className="text-xs text-slate-400">{att.email || att.phone || att.role}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${att.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                {att.isActive ? "Ativo" : "Inativo"}
              </span>
              <button onClick={() => handleDelete(att.id)} className="h-7 w-7 rounded-lg hover:bg-red-50 flex items-center justify-center">
                <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-3">
            <h3 className="font-semibold text-slate-900">Novo Atendente</h3>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (opcional)"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefone (opcional)"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <div className="flex gap-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={handleCreate} disabled={creating || !name.trim()}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {creating ? "Adicionando..." : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
