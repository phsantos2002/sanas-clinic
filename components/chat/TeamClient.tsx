"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, Trash2, UserCircle, Target, Filter } from "lucide-react";
import { toast } from "sonner";
import { createAttendant, deleteAttendant, type AttendantData } from "@/app/actions/whatsappHub";
import { updateAttendantRole, updateAttendantActivityGoal } from "@/app/actions/prospeccao";
import { setAttendantFunnelAccess } from "@/app/actions/attendantAssignments";
import { ATTENDANT_ROLES, toCanonicalRole, type AttendantRole } from "@/lib/prospeccao";
import type { FunnelData } from "@/app/actions/funnels";
import type { Stage } from "@/types";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  manager: "bg-purple-100 text-purple-700",
  seller: "bg-indigo-100 text-indigo-700",
  cs: "bg-emerald-100 text-emerald-700",
  // Legacy fallbacks
  sdr_manager: "bg-purple-100 text-purple-700",
  sdr: "bg-indigo-100 text-indigo-700",
  closer_manager: "bg-emerald-100 text-emerald-700",
  closer: "bg-green-100 text-green-700",
  attendant: "bg-slate-100 text-slate-600",
};

type TeamAttendant = AttendantData & { dailyActivityGoal?: number };

type Props = {
  attendants: TeamAttendant[];
  funnels?: FunnelData[];
  stages?: Stage[];
};

export function TeamClient({ attendants, funnels = [], stages = [] }: Props) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<AttendantRole>("seller");
  const [creating, setCreating] = useState(false);
  // Access assignment (optional on create)
  const [accessFunnelId, setAccessFunnelId] = useState<string>("");
  const [accessMode, setAccessMode] = useState<"all" | "some">("all");
  const [accessStageIds, setAccessStageIds] = useState<Set<string>>(new Set());

  const funnelStages = accessFunnelId ? stages.filter((s) => s.funnelId === accessFunnelId) : [];

  function resetCreateForm() {
    setName("");
    setEmail("");
    setPhone("");
    setRole("seller");
    setAccessFunnelId("");
    setAccessMode("all");
    setAccessStageIds(new Set());
  }

  const handleCreate = async () => {
    if (!name.trim()) return;
    // Admin and manager roles typically have full access; don't require a funnel.
    const wantsAccess = !!accessFunnelId;
    if (wantsAccess && accessMode === "some" && accessStageIds.size === 0) {
      toast.error("Selecione pelo menos uma etapa");
      return;
    }

    setCreating(true);
    const result = await createAttendant({
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      role,
    });

    if (!result.success) {
      setCreating(false);
      toast.error(result.error);
      return;
    }

    const attendantId = result.data?.id;
    if (attendantId && wantsAccess) {
      const assign = await setAttendantFunnelAccess(attendantId, accessFunnelId, {
        allStages: accessMode === "all",
        stageIds: accessMode === "some" ? Array.from(accessStageIds) : undefined,
      });
      if (!assign.success) {
        toast.error(`Usuario criado, mas acesso falhou: ${assign.error}`);
      }
    }

    setCreating(false);
    toast.success("Usuario adicionado!");
    setShowCreate(false);
    resetCreateForm();
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este usuario?")) return;
    await deleteAttendant(id);
    toast.success("Usuario removido");
    router.refresh();
  };

  const handleRoleChange = async (id: string, newRole: AttendantRole) => {
    const result = await updateAttendantRole(id, newRole);
    if (result.success) {
      toast.success("Papel atualizado");
      router.refresh();
    } else toast.error(result.error);
  };

  const handleGoalChange = async (id: string, goal: number) => {
    const result = await updateAttendantActivityGoal(id, goal);
    if (result.success) {
      toast.success("Meta salva");
      router.refresh();
    } else toast.error(result.error);
  };

  // Group by canonical role (legacy values fold into current roles)
  const grouped: Record<AttendantRole, TeamAttendant[]> = {
    admin: [],
    manager: [],
    seller: [],
    cs: [],
  };
  for (const a of attendants) {
    const k = toCanonicalRole(a.role);
    grouped[k].push(a);
  }
  const orderedGroups = ATTENDANT_ROLES.map((r) => r.value).filter((k) => grouped[k].length > 0);

  const roleLabel = (roleKey: AttendantRole): string =>
    ATTENDANT_ROLES.find((r) => r.value === roleKey)?.label ?? roleKey;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Usuarios</h2>
          <p className="text-sm text-slate-400 mt-0.5">Quem tem acesso ao CRM e com qual papel.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Novo usuario
        </button>
      </div>

      {attendants.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center">
          <Users className="h-10 w-10 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Nenhum usuario cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {orderedGroups.map((roleKey) => {
            return (
              <div key={roleKey}>
                <div className="flex items-baseline gap-2 mb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {roleLabel(roleKey)}
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    {grouped[roleKey].length} pessoa{grouped[roleKey].length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {grouped[roleKey].map((att) => (
                    <div
                      key={att.id}
                      className="bg-white border border-slate-100 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center shrink-0">
                          <UserCircle className="h-6 w-6 text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-900 text-sm truncate">
                            {att.name}
                          </h4>
                          <p className="text-xs text-slate-400 truncate">
                            {att.email || att.phone || "—"}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            att.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {att.isActive ? "Ativo" : "Inativo"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                        <div>
                          <label className="text-[10px] font-medium text-slate-500 block mb-1">
                            Papel
                          </label>
                          <select
                            value={toCanonicalRole(att.role)}
                            onChange={(e) =>
                              handleRoleChange(att.id, e.target.value as AttendantRole)
                            }
                            className={`w-full text-xs font-medium rounded-lg px-2 py-1 border-0 ${ROLE_COLORS[toCanonicalRole(att.role)] || ROLE_COLORS.seller}`}
                          >
                            {ATTENDANT_ROLES.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-medium text-slate-500 flex items-center gap-1 mb-1">
                            <Target className="h-3 w-3" /> Meta/dia
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={500}
                            defaultValue={att.dailyActivityGoal ?? 50}
                            onBlur={(e) => {
                              const n = Number(e.target.value);
                              if (!Number.isNaN(n) && n !== (att.dailyActivityGoal ?? 50)) {
                                handleGoalChange(att.id, n);
                              }
                            }}
                            className="w-full text-xs rounded-lg px-2 py-1 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(att.id)}
                        className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" /> Remover
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-slate-900">Novo Usuario</h3>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome completo"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (opcional)"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Telefone (opcional)"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Papel</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as AttendantRole)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {ATTENDANT_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label} — {r.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Funnel access */}
            {funnels.length > 0 && (
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5" /> Acesso ao funil
                </label>
                <select
                  value={accessFunnelId}
                  onChange={(e) => {
                    setAccessFunnelId(e.target.value);
                    setAccessStageIds(new Set());
                    setAccessMode("all");
                  }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— Sem acesso restrito (ve tudo) —</option>
                  {funnels.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>

                {accessFunnelId && (
                  <>
                    <div className="flex items-center gap-4 text-sm pt-1">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="accessMode"
                          checked={accessMode === "all"}
                          onChange={() => setAccessMode("all")}
                        />
                        <span>Todas as etapas</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="accessMode"
                          checked={accessMode === "some"}
                          onChange={() => setAccessMode("some")}
                        />
                        <span>Etapas especificas</span>
                      </label>
                    </div>

                    {accessMode === "some" && (
                      <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto bg-slate-50 rounded-xl p-2">
                        {funnelStages.length === 0 ? (
                          <p className="text-xs text-slate-400 col-span-2 text-center py-2">
                            Este funil nao tem etapas ainda.
                          </p>
                        ) : (
                          funnelStages.map((s) => {
                            const checked = accessStageIds.has(s.id);
                            return (
                              <label
                                key={s.id}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white cursor-pointer text-xs"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {
                                    setAccessStageIds((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(s.id)) next.delete(s.id);
                                      else next.add(s.id);
                                      return next;
                                    });
                                  }}
                                />
                                <span className="truncate">{s.name}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setShowCreate(false);
                  resetCreateForm();
                }}
                className="flex-1 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !name.trim()}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {creating ? "Adicionando..." : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
