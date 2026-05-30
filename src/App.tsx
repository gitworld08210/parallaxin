import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Feed from "./pages/Feed";
import Reels from "./pages/Reels";
import Discover from "./pages/Discover";
import Messages from "./pages/Messages";
import Conversation from "./pages/Conversation";
import Notifications from "./pages/Notifications";
import Compose from "./pages/Compose";
import ReelCompose from "./pages/ReelCompose";
import StoryCompose from "./pages/StoryCompose";
import PostDetail from "./pages/PostDetail";
import Tag from "./pages/Tag";
import Wallet from "./pages/Wallet";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import Premium from "./pages/Premium";
import Verification from "./pages/Verification";
import FollowList from "./pages/FollowList";
import Assistant from "./pages/Assistant";
import Drafts from "./pages/Drafts";
import PostInsights from "./pages/PostInsights";
import CloseFriends from "./pages/CloseFriends";

import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<Feed />} />
                <Route path="/reels" element={<Reels />} />
                <Route path="/discover" element={<Discover />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/messages/:id" element={<Conversation />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/compose" element={<Compose />} />
                <Route path="/compose/reel" element={<ReelCompose />} />
                <Route path="/compose/story" element={<StoryCompose />} />
                <Route path="/p/:postId" element={<PostDetail />} />
                <Route path="/tag/:tag" element={<Tag />} />
                <Route path="/wallet" element={<Wallet />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/edit" element={<EditProfile />} />
                <Route path="/u/:username" element={<Profile />} />
                <Route path="/u/:username/:kind" element={<FollowList />} />
                <Route path="/premium" element={<Premium />} />
                <Route path="/verification" element={<Verification />} />
                <Route path="/assistant" element={<Assistant />} />
                <Route path="/drafts" element={<Drafts />} />
                <Route path="/p/:postId/insights" element={<PostInsights />} />
                <Route path="/close-friends" element={<CloseFriends />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
