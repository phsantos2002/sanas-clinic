import { Suspense } from "react";
import { StudioChatClient } from "@/components/studio/StudioChatClient";

export default function StudioChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <StudioChatClient />
    </Suspense>
  );
}
