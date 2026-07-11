// RecentProjects — placeholder empty state until Projects feature ships.
import { FolderKanban } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const RecentProjects = () => (
  <Card>
    <CardContent className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Projects</h2>
        <span className="text-xs text-muted-foreground">Coming soon</span>
      </div>
      <div className="flex flex-col items-center gap-3 py-8 text-center text-muted-foreground">
        <FolderKanban className="h-10 w-10" />
        <p className="text-sm">Projects unlock in an upcoming release.</p>
      </div>
    </CardContent>
  </Card>
);

export default RecentProjects;
