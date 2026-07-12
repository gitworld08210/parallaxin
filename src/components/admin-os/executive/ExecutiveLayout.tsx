import { Outlet } from "react-router-dom";
import { ExecutiveSidebar } from "./ExecutiveSidebar";
import { ExecutiveTopbar } from "./ExecutiveTopbar";

export const ExecutiveLayout = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        <aside className="hidden lg:block w-64 shrink-0 border-r border-border/60 bg-card/40 min-h-screen sticky top-0 h-screen">
          <ExecutiveSidebar />
        </aside>
        <div className="flex-1 min-w-0 flex flex-col">
          <ExecutiveTopbar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveLayout;
