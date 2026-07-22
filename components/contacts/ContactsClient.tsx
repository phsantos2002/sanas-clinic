"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle, RefreshCw, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { getContacts, syncContactsFromConnection, type ContactRow } from "@/app/actions/contacts";
import type { ConnectionData } from "@/app/actions/connections";

type Props = {
  initialContacts: ContactRow[];
  connections: ConnectionData[];
};

function fmtDate(d: Date | string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

export function ContactsClient({ initialContacts, connections }: Props) {
  const router = useRouter();
  const [contacts, setContacts] = useState(initialContacts);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const evolutionConns = connections.filter((c) => c.provider === "evolution" && c.isActive);

  const handleSearch = async (value: string) => {
    setSearch(value);
    setSearching(true);
    const rows = await getContacts(value);
    setContacts(rows);
    setSearching(false);
  };

  const handleSync = async () => {
    if (evolutionConns.length === 0) {
      toast.error("Conecte um WhatsApp em Config > Conexões primeiro");
      return;
    }
    setSyncing(true);
    let imported = 0;
    let updated = 0;
    for (const conn of evolutionConns) {
      const result = await syncContactsFromConnection(conn.id);
      if (result.success && result.data) {
        imported += result.data.imported;
        updated += result.data.updated;
      } else if (!result.success) {
        toast.error(`${conn.label}: ${result.error}`);
      }
    }
    setSyncing(false);
    toast.success(`Sincronizado: ${imported} novos, ${updated} atualizados`);
    const rows = await getContacts(search);
    setContacts(rows);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar por nome, telefone ou email..."
            className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {searching && <Loader2 className="h-4 w-4 text-slate-300 animate-spin" />}
        <div className="flex-1" />
        <span className="text-xs text-slate-400">{contacts.length} contatos</span>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-3.5 py-2 rounded-xl"
          title="Importa a agenda do WhatsApp conectado"
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Sincronizar do WhatsApp
        </button>
      </div>

      {contacts.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center">
          <Users className="h-8 w-8 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Nenhum contato ainda.</p>
          <p className="text-xs text-slate-400 mt-1">
            Clique em “Sincronizar do WhatsApp” para importar a agenda do número conectado.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Contato</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Telefone</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Etapa</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Vendedor</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Tags</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Aniversário</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Última conversa</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        {c.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.photoUrl}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate max-w-[180px]">
                            {c.name}
                          </p>
                          {c.email && (
                            <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
                              {c.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{c.phone}</td>
                    <td className="px-4 py-2.5">
                      {c.stageName ? (
                        <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {c.stageName}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                      {c.assignedToName ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1 flex-wrap max-w-[140px]">
                        {c.tags.slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="text-[10px] bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded"
                          >
                            {t}
                          </span>
                        ))}
                        {c.tags.length > 2 && (
                          <span className="text-[10px] text-slate-400">+{c.tags.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                      {fmtDate(c.birthday)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                      {fmtDate(c.lastInteractionAt)}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => router.push(`/dashboard/chat?leadId=${c.id}`)}
                        className="p-1.5 text-slate-300 hover:text-green-600 rounded-lg"
                        title="Abrir conversa"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
