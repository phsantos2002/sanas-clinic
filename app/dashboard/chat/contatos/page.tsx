import { redirect } from "next/navigation";

// Contatos agora é um item próprio da navegação principal.
export default function ContatosRedirect() {
  redirect("/dashboard/contatos");
}
