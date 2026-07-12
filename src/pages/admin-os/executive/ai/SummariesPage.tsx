import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { streamExecutiveAi } from "@/hooks/admin-os/useExecutiveAi";
import { toast } from "sonner";

const SUMMARY_TYPES = ["Weekly Report", "Monthly Report", "Quarterly Report", "Annual Report", "Department Report", "Incident Report", "Audit Report", "Decision Log Summary"];

const SummariesPage = () => {
  const [type, setType] = useState(SUMMARY_TYPES[0]);
  const [source, setSource] = useState("");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    if (!source.trim()) return;
    setBusy(true);
    setSummary("");
    try {
      await streamExecutiveAi({
        messages: [
          {
            role: "user",
            content: `Produce an executive ${type} summary from the source content below.\n\nFormat:\n- **Overview** (2-3 sentences)\n- **Key Points** (bullets)\n- **Risks / Concerns**\n- **Recommended Actions** (each with confidence)\n- **Confidence: low / medium / high**\n\nSource content:\n${source}`,
          },
        ],
        onDelta: (d) => setSummary((prev) => prev + d),
      });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" /> Source</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Summary type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SUMMARY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Paste source content (report body, decisions, incident notes, etc.)</Label>
            <Textarea rows={14} value={source} onChange={(e) => setSource(e.target.value)} placeholder="Paste the raw report or notes here..." />
          </div>
          <Button onClick={generate} disabled={busy || !source.trim()} className="w-full">
            <Sparkles className="h-4 w-4 mr-2" /> {busy ? "Generating..." : "Generate Executive Summary"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Generated Summary</CardTitle></CardHeader>
        <CardContent>
          {summary ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{summary}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">The summary will appear here.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SummariesPage;
