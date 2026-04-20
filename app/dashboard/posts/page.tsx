import { getAllScheduledPosts, getScheduledPosts } from "@/app/actions/social";
import { CalendarClient } from "@/components/social/CalendarClient";

export default async function PostsCalendarPage() {
  const now = new Date();
  const [monthPosts, allPosts] = await Promise.all([
    getScheduledPosts(now.getMonth(), now.getFullYear()),
    getAllScheduledPosts(),
  ]);
  return (
    <CalendarClient
      initialPosts={monthPosts}
      initialAllPosts={allPosts}
      initialMonth={now.getMonth()}
      initialYear={now.getFullYear()}
    />
  );
}
