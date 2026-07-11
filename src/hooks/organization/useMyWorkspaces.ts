// useMyWorkspaces — workspaces the signed-in user belongs to (owner OR member).
// Thin wrapper around useUserOrganizations so every consumer (SideMenu,
// Settings, WorkspaceSwitcher, Profile) shares one canonical source.
import { useAuth } from "@/contexts/AuthProvider";
import { useUserOrganizations } from "./useUserOrganizations";

export const useMyWorkspaces = () => {
  const { user } = useAuth();
  const { memberships, loading, error } = useUserOrganizations(user?.id ?? null);
  return { workspaces: memberships, loading, error };
};
