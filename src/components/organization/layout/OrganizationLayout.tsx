import { Outlet } from "react-router-dom";
import { OrganizationSidebar } from "./OrganizationSidebar";
import { OrganizationTopbar } from "./OrganizationTopbar";
import { OrganizationMobileNavigation } from "./OrganizationMobileNavigation";

// Shell for every /organization/* route. Wire responsive layout as needed.
export const OrganizationLayout = () => {
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

export default OrganizationLayout;
