import { listStories } from "@/app/actions/story";
import { StudioClient } from "@/components/social/pipeline/StudioClient";

export default async function StudioPage() {
  const stories = await listStories();
  return <StudioClient initialStories={stories} />;
}
