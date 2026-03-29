import { getSocialPosts } from "@/app/actions/social";
import { PostsLibraryClient } from "@/components/social/PostsLibraryClient";

export default async function PostsPage() {
  const posts = await getSocialPosts();
  return <PostsLibraryClient initialPosts={posts} />;
}
