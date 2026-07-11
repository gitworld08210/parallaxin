import { Outlet } from "react-router-dom";
import { OrganizationSidebar } from "./OrganizationSidebar";
import { OrganizationTopbar } from "./OrganizationTopbar";
import { OrganizationMobileNavigation } from "./OrganizationMobileNavigation";
import { OrganizationProvider, useOrganizationContext } from "@/contexts/OrganizationProvider";

const OrganizationShell = () => {
  const { loading, error, organization, organizationId } = useOrganizationContext();

  if (loading && !organization) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen grid place-items-center p-8 text-center">
        <div className="max-w-md space-y-2">
          <h2 className="text-lg font-semibold">We couldn't load this organization.</h2>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="min-h-screen grid place-items-center p-8 text-center">
        <div className="max-w-md space-y-2">
          <h2 className="text-lg font-semibold">No organization workspace yet.</h2>
          <p className="text-sm text-muted-foreground">
            Create an organization from the onboarding screen to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-component="OrganizationLayout" className="min-h-screen flex flex-col">
      <OrganizationTopbar />
      <div className="flex flex-1">
        <OrganizationSidebar />
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
      <OrganizationMobileNavigation />
    </div>
  );
};

// Shell for every /organization/* route. Provides OrganizationContext.
export const OrganizationLayout = () => (
  <OrganizationProvider>
    <OrganizationShell />
  </OrganizationProvider>
);

export default OrganizationLayout;
