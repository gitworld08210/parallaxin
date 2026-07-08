import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoamiTool from "./tools/whoami";
import listMyPostsTool from "./tools/list-my-posts";
import listNotificationsTool from "./tools/list-notifications";
import createPostTool from "./tools/create-post";

// Build the OAuth issuer from the Supabase project ref (Vite inlines this at
// build time, so it stays import-safe).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "aurelix-mcp",
  title: "Aurelix",
  version: "0.1.0",
  instructions:
    "Tools for the Aurelix creator platform. Read the signed-in user's profile, list their posts and notifications, and publish new posts. All tools act as the authenticated user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoamiTool, listMyPostsTool, listNotificationsTool, createPostTool],
});
