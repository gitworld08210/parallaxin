import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette } from "lucide-react";

const DesignCenter = () => (
  <div className="space-y-4">
    <h2 className="text-lg font-semibold">Design Center</h2>
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {[
        { title: "Design System", desc: "Tokens, primitives and shared components." },
        { title: "Wireframes", desc: "Low-fidelity structure and flows." },
        { title: "Mockups", desc: "High-fidelity visuals for review." },
        { title: "Prototypes", desc: "Interactive design prototypes." },
        { title: "Design Reviews", desc: "Scheduled reviews and approval history." },
        { title: "UI Components", desc: "Shared UI library and usage guidelines." },
      ].map((c) => (
        <Card key={c.title}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="h-4 w-4 text-primary" />
              {c.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">{c.desc}</CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default DesignCenter;
