import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Play, Pause, RotateCcw, Volume2, Maximize, 
  Check, X, AlertCircle, Info, Brain, Sparkles
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { useReviewContent } from "../hooks/useContentQueue";
import { useTaxonomy } from "../hooks/useContentContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export const ReviewerWorkspace = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const reviewMutation = useReviewContent();
  const { data: taxonomy = [] } = useTaxonomy();
  
  const { data: item, isLoading } = useQuery({
    queryKey: ['content-context-detail', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('content_context')
        .select('*')
        .eq('content_id', id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  if (isLoading) return <div>Loading review workspace...</div>;
  if (!item) return <div>Content not found.</div>;

  const confidenceScores = item.confidence_scores || {};
  const signals = item.signal_contributions || {};

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
      {/* Left Column: Player & Signals */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        <Card className="flex-1 bg-black/90 relative group overflow-hidden border-none rounded-xl">
          <div className="absolute inset-0 flex items-center justify-center text-white/50 italic">
            [ Reel Player Placeholder: {item.content_id} ]
          </div>
          
          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="ghost" className="text-white hover:bg-white/20"><Play className="h-5 w-5" /></Button>
            <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
              <div className="w-1/3 h-full bg-primary" />
            </div>
            <Button size="icon" variant="ghost" className="text-white hover:bg-white/20"><Volume2 className="h-5 w-5" /></Button>
            <Button size="icon" variant="ghost" className="text-white hover:bg-white/20"><Maximize className="h-5 w-5" /></Button>
          </div>
        </Card>

        <Card className="h-1/3">
          <Tabs defaultValue="metadata" className="h-full flex flex-col">
            <div className="px-4 pt-2 border-b">
              <TabsList className="bg-transparent border-none p-0 h-10">
                <TabsTrigger value="metadata" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Metadata</TabsTrigger>
                <TabsTrigger value="signals" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">AI Signals</TabsTrigger>
                <TabsTrigger value="ocr" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">OCR/ASR</TabsTrigger>
              </TabsList>
            </div>
            <ScrollArea className="flex-1">
              <TabsContent value="metadata" className="p-4 space-y-4 m-0">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block">Classification Version</span>
                    <span>{item.classification_version}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Model Pipeline</span>
                    <span>{item.model_pipeline_version}</span>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="signals" className="p-4 space-y-4 m-0">
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(signals).map(([name, contribution]: [string, any]) => (
                    <div key={name} className="space-y-2 p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="capitalize text-muted-foreground">{name}</span>
                        <span className="font-bold">{(contribution * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={contribution * 100} className="h-1 bg-white/10" />
                    </div>
                  ))}
                </div>
                <div className="pt-2">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Signal Fusion Outcome</div>
                  <div className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded-lg text-primary text-xs">
                    <Sparkles className="h-3 w-3" />
                    Multi-signal agreement: {item.signal_agreement.toUpperCase()}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="ocr" className="p-4 m-0 space-y-4">
                <div className="space-y-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Extracted OCR Text</div>
                  <div className="bg-muted/30 rounded-xl p-3 text-sm italic text-muted-foreground border border-white/5">
                    {item.ocr_reference || "No visible text detected in sampled frames."}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest">ASR Transcript (Whisper)</div>
                  <div className="bg-muted/30 rounded-xl p-3 text-sm text-white/70 border border-white/5">
                    {item.transcript_reference || "No speech signals identified in this content."}
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </Card>
      </div>

      {/* Right Column: Classification Controls */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <Card className="flex flex-col h-full border-primary/20 shadow-lg shadow-primary/5">
          <CardHeader className="border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                AI Classification
              </CardTitle>
              <Badge variant={item.signal_agreement === 'low' ? 'destructive' : 'secondary'}>
                {item.signal_agreement.toUpperCase()} AGREEMENT
              </Badge>
            </div>
          </CardHeader>
          
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-6">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-3 block">Probabilistic Predictions</Label>
                <div className="space-y-4">
                  {Object.entries(confidenceScores).map(([category, score]: [string, any]) => (
                    <div key={category} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{category}</span>
                        <span className="text-muted-foreground">{(score * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={score * 100} className="h-1.5" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-border/40">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-3 block">Decision Parameters</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/30 rounded-lg text-center">
                    <div className="text-xl font-bold">{(item.ambiguity_score * 100).toFixed(0)}%</div>
                    <div className="text-[10px] text-muted-foreground">AMBIGUITY</div>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg text-center">
                    <div className="text-xl font-bold">{(Object.values(confidenceScores).reduce((a: any, b: any) => Math.max(a, b), 0) as number * 100).toFixed(0)}%</div>
                    <div className="text-[10px] text-muted-foreground">CONFIDENCE</div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="p-6 border-t bg-muted/10 space-y-3">
            <div className="flex gap-3">
              <Button 
                className="flex-1 gap-2" 
                variant="default"
                disabled={reviewMutation.isPending}
                onClick={() => reviewMutation.mutate({ 
                  id: item.id, 
                  status: 'classified',
                  categoryId: item.primary_category_id 
                }, { onSuccess: () => navigate('/admin-os/verification/content-review') })}
              >
                <Check className="h-4 w-4" /> Accept AI
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="flex-1 gap-2" variant="outline" disabled={reviewMutation.isPending}>
                    <Info className="h-4 w-4" /> Change Category
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {taxonomy.filter(t => t.level === 1).map(cat => (
                    <DropdownMenuItem 
                      key={cat.id}
                      onClick={() => reviewMutation.mutate({ 
                        id: item.id, 
                        status: 'classified',
                        categoryId: cat.id 
                      }, { onSuccess: () => navigate('/admin-os/verification/content-review') })}
                    >
                      {cat.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex gap-3">
              <Button 
                className="flex-1 gap-2" 
                variant="secondary"
                disabled={reviewMutation.isPending}
                onClick={() => reviewMutation.mutate({ 
                  id: item.id, 
                  status: 'classified',
                  notes: 'Unknown classification'
                }, { onSuccess: () => navigate('/admin-os/verification/content-review') })}
              >
                <AlertCircle className="h-4 w-4" /> Mark Unknown
              </Button>
              <Button 
                className="flex-1 gap-2" 
                variant="destructive"
                disabled={reviewMutation.isPending}
                onClick={() => reviewMutation.mutate({ 
                  id: item.id, 
                  status: 'escalated'
                }, { onSuccess: () => navigate('/admin-os/verification/content-review') })}
              >
                <X className="h-4 w-4" /> Escalate
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={className}>{children}</span>
);
