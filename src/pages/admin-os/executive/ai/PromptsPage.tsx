import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSavedPrompts, useSavePrompt, useDeletePrompt } from "@/hooks/admin-os/useExecutiveAi";
import { Trash2, BookMarked } from "lucide-react";

const CATS = ["general", "hr", "finance", "security", "operations", "reports", "governance"];

const PromptsPage = () => {
  const { data = [] } = useSavedPrompts();
  const save = useSavePrompt();
  const del = useDeletePrompt();
  const [form, setForm] = useState<any>({ title: "", prompt: "", category: "general", is_shared: false });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BookMarked className="h-4 w-4" /> New Saved Prompt</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-3">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label>Prompt</Label><Textarea rows={4} value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} /></div>
          <div className="flex items-center gap-2">
            <Switch checked={form.is_shared} onCheckedChange={(v) => setForm({ ...form, is_shared: v })} />
            <Label>Share with team</Label>
          </div>
          <div className="flex justify-end md:col-span-2">
            <Button onClick={() => save.mutate(form)} disabled={!form.title || !form.prompt}>Save Prompt</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-3">
        {data.map((p: any) => (
          <Card key={p.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{p.title}</CardTitle>
                <div className="flex gap-2 items-center">
                  <Badge variant="outline">{p.category}</Badge>
                  {p.is_shared && <Badge>shared</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{p.prompt}</p>
              <div className="flex justify-end">
                <Button size="sm" variant="ghost" onClick={() => del.mutate(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {data.length === 0 && <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No saved prompts yet.</CardContent></Card>}
      </div>
    </div>
  );
};

export default PromptsPage;
