import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TopBar } from "@/components/vibe/TopBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";
import { ShieldCheck, UserCheck, AlertCircle, Clock, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { updateDoc, doc, runTransaction } from "firebase/firestore";

const VerificationQueue = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "verification_requests"),
      orderBy("created_at", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleAction = async (req: any, status: 'approved' | 'rejected') => {
    try {
      await runTransaction(db, async (transaction) => {
        const reqRef = doc(db, "verification_requests", req.id);
        const profileRef = doc(db, "profiles", req.user_id);

        transaction.update(reqRef, {
          status,
          reviewed_at: new Date().toISOString(),
          reviewer_id: user?.id
        });

        if (status === 'approved') {
          transaction.update(profileRef, {
            verified: true,
            verification_kind: req.kind || 'verified'
          });
        }
      });
      toast.success(`Request ${status}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <TopBar title="Verification Queue" subtitle="Admin OS / Trust & Safety" />
      
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="w-full grid grid-cols-3 bg-muted/50 p-1 rounded-xl mb-4">
            <TabsTrigger value="pending" className="rounded-lg text-xs font-semibold">Pending</TabsTrigger>
            <TabsTrigger value="approved" className="rounded-lg text-xs font-semibold">Approved</TabsTrigger>
            <TabsTrigger value="rejected" className="rounded-lg text-xs font-semibold">Rejected</TabsTrigger>
          </TabsList>

          {['pending', 'approved', 'rejected'].map((s) => (
            <TabsContent key={s} value={s} className="space-y-3 mt-0">
              {requests.filter(r => r.status === s).map((req) => (
                <div key={req.id} className="p-4 rounded-2xl border border-white/[0.08] bg-card/40 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserCheck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">@{req.username}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {req.kind?.toUpperCase()} Request · {req.created_at ? format(new Date(req.created_at), 'MMM d, h:mm a') : 'Just now'}
                        </p>
                      </div>
                    </div>
                    {req.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleAction(req, 'rejected')}
                          className="h-8 w-8 rounded-full bg-destructive/10 text-destructive grid place-items-center hover:bg-destructive/20 transition-colors"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleAction(req, 'approved')}
                          className="h-8 w-8 rounded-full bg-primary/10 text-primary grid place-items-center hover:bg-primary/20 transition-colors"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {req.id_url && (
                    <div className="rounded-xl overflow-hidden border border-white/5 bg-black/20">
                      <img src={req.id_url} alt="ID Document" className="w-full h-32 object-cover opacity-80 hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2 rounded-lg bg-muted/30 border border-white/5">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Legal Name</p>
                      <p className="text-xs font-medium truncate">{req.legal_name || 'N/A'}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/30 border border-white/5">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Document</p>
                      <p className="text-xs font-medium truncate">{req.doc_type || 'ID Card'}</p>
                    </div>
                  </div>
                </div>
              ))}

              {requests.filter(r => r.status === s).length === 0 && !loading && (
                <div className="py-20 text-center space-y-2 opacity-40">
                  <CheckCircle2 className="h-10 w-10 mx-auto" />
                  <p className="text-sm font-medium">Queue is empty</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default VerificationQueue;
