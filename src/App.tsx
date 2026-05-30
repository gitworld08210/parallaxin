import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";

// Eager: critical first-paint routes
import Feed from "./pages/Feed";
import Auth from "./pages/Auth";

// Lazy: everything else streams in on demand
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Reels = lazy(() => import("./pages/Reels"));
const Discover = lazy(() => import("./pages/Discover"));
const Messages = lazy(() => import("./pages/Messages"));
const Conversation = lazy(() => import("./pages/Conversation"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Compose = lazy(() => import("./pages/Compose"));
const ReelCompose = lazy(() => import("./pages/ReelCompose"));
const StoryCompose = lazy(() => import("./pages/StoryCompose"));
const PostDetail = lazy(() => import("./pages/PostDetail"));
const Tag = lazy(() => import("./pages/Tag"));
const Wallet = lazy(() => import("./pages/Wallet"));
const Profile = lazy(() => import("./pages/Profile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const Premium = lazy(() => import("./pages/Premium"));
const VerificationCenter = lazy(() => import("./pages/VerificationCenter"));
const VerificationRequest = lazy(() => import("./pages/VerificationRequest"));
const FollowList = lazy(() => import("./pages/FollowList"));
const Assistant = lazy(() => import("./pages/Assistant"));
const Drafts = lazy(() => import("./pages/Drafts"));
const PostInsights = lazy(() => import("./pages/PostInsights"));
const CloseFriends = lazy(() => import("./pages/CloseFriends"));
const FounderChronicle = lazy(() => import("./pages/FounderChronicle"));
const HallOfFoundersScreen = lazy(() =>
  import("./components/founders/HallOfFoundersScreen").then((m) => ({ default: m.HallOfFoundersScreen }))
);
const FounderCouncilScreen = lazy(() =>
  import("./components/founders/FounderCouncilScreen").then((m) => ({ default: m.FounderCouncilScreen }))
);
const Settings = lazy(() => import("./pages/Settings"));
const TwoFactorSetup = lazy(() => import("./pages/security/TwoFactorSetup"));
const LoginActivityScreen = lazy(() => import("./pages/security/LoginActivityScreen"));
const PrivacyScreen = lazy(() => import("./pages/security/PrivacyScreen"));
const BlockedListScreen = lazy(() => import("./pages/security/BlockedListScreen"));
const DataExportScreen = lazy(() => import("./pages/security/DataExportScreen"));
const DeleteAccountScreen = lazy(() => import("./pages/security/DeleteAccountScreen"));
const ChangePasswordScreen = lazy(() => import("./pages/security/ChangePasswordScreen"));
const ChangeEmailScreen = lazy(() => import("./pages/security/ChangeEmailScreen"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-screen grid place-items-center">
    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/onboarding" element={<Onboarding />} />
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
                  <Route path="/hall-of-founders" element={<HallOfFoundersScreen />} />
                  <Route path="/founder-council" element={<FounderCouncilScreen />} />
                  <Route path="/founders/:username" element={<FounderChronicle />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/settings/security" element={<TwoFactorSetup />} />
                  <Route path="/settings/activity" element={<LoginActivityScreen />} />
                  <Route path="/settings/privacy" element={<PrivacyScreen />} />
                  <Route path="/settings/blocked" element={<BlockedListScreen />} />
                  <Route path="/settings/export" element={<DataExportScreen />} />
                  <Route path="/settings/delete" element={<DeleteAccountScreen />} />
                  <Route path="/settings/password" element={<ChangePasswordScreen />} />
                  <Route path="/settings/email" element={<ChangeEmailScreen />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
