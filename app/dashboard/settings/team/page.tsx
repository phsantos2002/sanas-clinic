import { getAttendants } from "@/app/actions/whatsappHub";
import { TeamClient } from "@/components/chat/TeamClient";

export default async function SettingsUsersPage() {
  const attendants = await getAttendants();
  return <TeamClient attendants={attendants} />;
}
