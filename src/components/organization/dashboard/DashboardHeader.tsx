// DashboardHeader — UI scaffold. Compose real markup as the feature ships.
import { Building2, CheckCircle2, Plus, Settings } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function DashboardHeader() {
  return (
    <div className="relative overflow-hidden rounded-3xl border bg-card">
      {/* Cover */}

      <div className="h-52 w-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500" />

      {/* Content */}

      <div className="px-8 pb-8">
        <div className="-mt-16 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-end gap-5">
            <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
              <AvatarImage src="/placeholder.svg" />

              <AvatarFallback className="text-4xl">A</AvatarFallback>
            </Avatar>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">Aurelix</h1>

                <CheckCircle2 className="h-6 w-6 text-sky-500" />

                <Badge>Organization</Badge>
              </div>

              <p className="mt-2 text-muted-foreground">Build • Collaborate • Ship faster</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary">Technology</Badge>

                <Badge variant="secondary">Startup</Badge>

                <Badge variant="secondary">Public</Badge>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create
            </Button>

            <Button variant="outline">
              <Building2 className="mr-2 h-4 w-4" />
              Workspace
            </Button>

            <Button variant="outline" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
