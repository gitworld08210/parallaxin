import { useAuth } from "@/contexts/AuthProvider";

export const useIsCreator = () => {
  const { profile, loading, refreshProfile } = useAuth();
  const isCreator = !!(profile as any)?.is_creator;
  return { isCreator, loading, refresh: refreshProfile || (() => Promise.resolve()) };
};
