import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

const VerificationHistory = () => {
  const { data = [] } = useQuery({
    queryKey: ["ver-history-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ver_history")
        .select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <Card><CardContent className="p-0 divide-y">
      {data.length === 0 && <div className="p-6 text-sm text-muted-foreground">No history yet.</div>}
      {data.map(h => (
        <div key={h.id} className="p-3 text-sm flex items-center justify-between">
          <div>
            <div className="font-medium">{h.event_type}</div>
            <div className="text-xs text-muted-foreground">
              {h.application_id ? `app:${h.application_id.slice(0,8)} ` : ""}
              {h.badge_id ? `badge:${h.badge_id.slice(0,8)}` : ""}
            </div>
          </div>
          <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span>
        </div>
      ))}
    </CardContent></Card>
  );
};

export default VerificationHistory;
