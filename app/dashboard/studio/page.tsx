import { getStudioProjects } from "@/app/actions/studioChat";
import { StudioProjectsList } from "@/components/studio/StudioProjectsList";

export default async function StudioPage() {
  const projects = await getStudioProjects();
  return <StudioProjectsList projects={projects} />;
}
