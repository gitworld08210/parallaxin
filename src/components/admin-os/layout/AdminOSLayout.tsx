import { Outlet } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";

export const AdminOSLayout = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-64 shrink-0 border-r border-border/60 bg-card/40 min-h-screen sticky top-0 h-screen">
          <AdminSidebar />
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          <AdminTopbar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminOSLayout;
