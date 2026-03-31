import { getSocialPosts } from "@/app/actions/social";
import { PostsLibraryClient } from "@/components/social/PostsLibraryClient";

export default async function PostsLibraryPage() {
  const posts = await getSocialPosts();
  return <PostsLibraryClient initialPosts={posts} />;
}
