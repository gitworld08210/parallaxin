// QuickActions — UI scaffold. Compose real markup as the feature ships.
import { FileText, Clapperboard, ImagePlus, UserPlus, FolderPlus, Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const actions = [
  {
    title: "Create Post",
    description: "Share updates with everyone",
    icon: FileText,
  },
  {
    title: "Upload Reel",
    description: "Publish a short video",
    icon: Clapperboard,
  },
  {
    title: "Add Story",
    description: "Post a temporary story",
    icon: ImagePlus,
  },
  {
    title: "Invite Member",
    description: "Grow your organization",
    icon: UserPlus,
  },
  {
    title: "New Project",
    description: "Start collaborating",
    icon: FolderPlus,
  },
  {
    title: "AI Assistant",
    description: "Ask Aurelix AI",
    icon: Sparkles,
  },
];

export const QuickActions = () => {
  return (
    <div>
      <h2 className="mb-5 text-xl font-bold">Quick Actions</h2>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Card
              key={action.title}
              className="cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <CardContent className="flex items-start gap-4 p-6">
                <div className="rounded-2xl bg-primary/10 p-3">
                  <Icon className="h-6 w-6 text-primary" />
                </div>

                <div>
                  <h3 className="font-semibold">{action.title}</h3>

                  <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActions;
