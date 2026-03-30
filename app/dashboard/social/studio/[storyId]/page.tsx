import { getStory } from "@/app/actions/story";
import { getPipelineStatus } from "@/app/actions/pipeline";
import { PipelineView } from "@/components/social/pipeline/PipelineView";
import { redirect } from "next/navigation";

export default async function StoryPipelinePage({ params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await params;
  const [story, status] = await Promise.all([
    getStory(storyId),
    getPipelineStatus(storyId),
  ]);

  if (!story || !status) redirect("/dashboard/social/studio");

  return <PipelineView story={story} pipelineStatus={status} />;
}
