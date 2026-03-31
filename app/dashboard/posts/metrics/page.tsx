import { getSocialStats, getSocialPosts, getSocialConnections } from "@/app/actions/social";
import { SocialAnalyticsClient } from "@/components/social/SocialAnalyticsClient";

export default async function PostsMetricsPage() {
  const [stats, posts, connections] = await Promise.all([
    getSocialStats(),
    getSocialPosts({ status: "published" }),
    getSocialConnections(),
  ]);

  return (
    <SocialAnalyticsClient
      stats={stats ?? { totalPosts: 0, publishedPosts: 0, scheduledPosts: 0, draftPosts: 0, connections: 0 }}
      publishedPosts={posts}
      connections={connections}
    />
  );
}
