import { getSocialStats, getSocialPosts } from "@/app/actions/social";
import { getSocialConnections } from "@/app/actions/social";
import { SocialAnalyticsClient } from "@/components/social/SocialAnalyticsClient";

export default async function AnalyticsPage() {
  const [stats, posts, connections] = await Promise.all([
    getSocialStats(),
    getSocialPosts({ status: "published" }),
    getSocialConnections(),
  ]);

  return (
    <SocialAnalyticsClient
      stats={stats}
      publishedPosts={posts}
      connections={connections}
    />
  );
}
