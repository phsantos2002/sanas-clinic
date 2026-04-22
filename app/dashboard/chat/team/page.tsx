import { redirect } from "next/navigation";

export default function ChatTeamRedirect() {
  redirect("/dashboard/settings/team");
}
