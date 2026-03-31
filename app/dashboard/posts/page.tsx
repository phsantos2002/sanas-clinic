import { getScheduledPosts } from "@/app/actions/social";
import { CalendarClient } from "@/components/social/CalendarClient";

export default async function PostsCalendarPage() {
  const now = new Date();
  const posts = await getScheduledPosts(now.getMonth(), now.getFullYear());
  return (
    <CalendarClient
      initialPosts={posts}
      initialMonth={now.getMonth()}
      initialYear={now.getFullYear()}
    />
  );
}
