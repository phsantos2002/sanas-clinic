import { redirect } from "next/navigation";

// Movida para dentro do layout do Chat (abas WhatsApp | Atendimentos | Contatos).
export default function AtendimentosRedirect() {
  redirect("/dashboard/chat/atendimentos");
}
