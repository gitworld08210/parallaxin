import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useContentQueue } from "../hooks/useContentQueue";
import { Link } from "react-router-dom";
import { BrainCircuit, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

export const ContentClassificationQueue = () => {
  const { data: queue = [], isLoading } = useContentQueue();

  if (isLoading) return <div>Loading queue...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-primary" />
          Content Classification Queue
        </h2>
        <Badge variant="outline">{queue.length} Pending</Badge>
      </div>

      <Card>
        <CardContent className="p-0 divide-y divide-border/40">
          {queue.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p>Queue is empty. All content classified.</p>
            </div>
          ) : (
            queue.map((item: any) => (
              <Link
                key={item.id}
                to={`/admin-os/verification/content-review/${item.id}`}
                className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Content ID: {item.content_id.slice(0, 8)}</span>
                    <Badge variant={item.signal_agreement === 'low' ? 'destructive' : 'secondary'}>
                      {item.signal_agreement === 'low' && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {item.signal_agreement.toUpperCase()} AGREEMENT
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                    <span>Ambiguity: {(item.ambiguity_score * 100).toFixed(0)}%</span>
                  </div>
                </div>
                <Button size="sm" variant="ghost">Review</Button>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
