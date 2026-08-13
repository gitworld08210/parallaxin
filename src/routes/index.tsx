// Social platform routes updated for stability.
import { Navigate, Route, Routes } from "react-router-dom";
import Feed from "../pages/Feed";
import Auth from "../pages/Auth";
import ProfileCreation from "../pages/ProfileCreation";
import Profile from "../pages/Profile";
import EditProfile from "../pages/EditProfile";
import Messages from "../pages/Messages";
import Reels from "../pages/Reels";
import Discover from "../pages/Discover";
import VirtualWorld from "../pages/VirtualWorld";
import Wallet from "../pages/Wallet";
import Notifications from "../pages/Notifications";
import Compose from "../pages/Compose";
import ReelCompose from "../pages/ReelCompose";
import StoryCompose from "../pages/StoryCompose";
import Assistant from "../pages/Assistant";
import { AppShell } from "../components/layout/AppShell";
import { ProtectedRoute } from "../components/ProtectedRoute";

import { useScrollReset } from "../hooks/use-scroll-reset";

export default function AppRoutes() {
  useScrollReset();
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/profile-creation" element={<ProfileCreation />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<Feed />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/u/:username" element={<Profile />} />
          <Route path="/profile/edit" element={<EditProfile />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/reels" element={<Reels />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/virtual-world" element={<VirtualWorld />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/compose" element={<Compose />} />
          <Route path="/compose/reel" element={<ReelCompose />} />
          <Route path="/compose/story" element={<StoryCompose />} />
          <Route path="/assistant" element={<Assistant />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
