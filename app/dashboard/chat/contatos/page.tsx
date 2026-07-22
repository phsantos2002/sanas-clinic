import { getContacts } from "@/app/actions/contacts";
import { getConnections } from "@/app/actions/connections";
import { ContactsClient } from "@/components/contacts/ContactsClient";

export const dynamic = "force-dynamic";

export default async function ContatosPage() {
  const [contacts, connections] = await Promise.all([getContacts(), getConnections()]);

  return (
    <div className="space-y-3 pb-6">
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-slate-900">Contatos</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Banco de contatos do seu WhatsApp — sincronizado com a agenda do número conectado
        </p>
      </div>
      <ContactsClient initialContacts={contacts} connections={connections} />
    </div>
  );
}
