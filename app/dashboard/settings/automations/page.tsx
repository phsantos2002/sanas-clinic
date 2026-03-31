import { getAutomations, saveAutomations } from "@/app/actions/brandSettings";
import { getWorkflows } from "@/app/actions/workflows";
import { AutomationsForm } from "@/components/settings/AutomationsForm";

export default async function AutomationsPage() {
  const [automations, workflows] = await Promise.all([
    getAutomations(),
    getWorkflows(),
  ]);

  const activeWorkflows = workflows.filter((w) => w.isActive).length;
  const totalWorkflows = workflows.length;

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Workflows summary */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Workflows Personalizados</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {activeWorkflows} ativo{activeWorkflows !== 1 ? "s" : ""} de {totalWorkflows} workflow{totalWorkflows !== 1 ? "s" : ""}
            </p>
          </div>
          <a href="/dashboard/workflows" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            Gerenciar workflows →
          </a>
        </div>
      </div>

      {/* System Automations */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Automacoes do Sistema</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Ative ou desative funcionalidades automaticas por categoria
          </p>
        </div>
        <AutomationsForm initial={automations} onSave={saveAutomations} />
      </div>
    </div>
  );
}
