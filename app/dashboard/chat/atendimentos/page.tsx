import { listTickets, getTicketCounts } from "@/app/actions/tickets";
import { getAttendants, getMessageTemplates } from "@/app/actions/whatsappHub";
import { getConnections } from "@/app/actions/connections";
import { AtendimentosClient } from "@/components/atendimentos/AtendimentosClient";

export const dynamic = "force-dynamic";

export default async function AtendimentosPage() {
  const [initialTickets, initialCounts, attendants, templates, connections] = await Promise.all([
    listTickets("pending"),
    getTicketCounts(),
    getAttendants(),
    getMessageTemplates(),
    getConnections(),
  ]);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-slate-900">Atendimentos</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Fila de espera, atendimentos em andamento e conversas resolvidas pela IA
        </p>
      </div>
      <AtendimentosClient
        initialTickets={initialTickets}
        initialCounts={initialCounts}
        attendants={attendants}
        templates={templates}
        connections={connections.filter((c) => c.isActive)}
      />
    </div>
  );
}
