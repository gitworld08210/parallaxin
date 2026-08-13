import { Navigate, Route, Routes } from "react-router-dom";
import Feed from "../pages/Feed";
import Auth from "../pages/Auth";
import Onboarding from "../pages/Onboarding";
import { AppShell } from "../components/layout/AppShell";
import { ProtectedRoute } from "../components/ProtectedRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route element={<AppShell />}>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Feed />} />
          <Route path="/onboarding" element={<Onboarding />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
