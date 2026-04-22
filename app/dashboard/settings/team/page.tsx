import { getAttendants } from "@/app/actions/whatsappHub";
import { getFunnels } from "@/app/actions/funnels";
import { getStages } from "@/app/actions/stages";
import { TeamClient } from "@/components/chat/TeamClient";

export default async function SettingsUsersPage() {
  const [attendants, funnels, stages] = await Promise.all([
    getAttendants(),
    getFunnels(),
    getStages(),
  ]);
  return <TeamClient attendants={attendants} funnels={funnels} stages={stages} />;
}
