import { useState, useEffect } from "react";
import { TopBar } from "@/components/vibe/TopBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthProvider";
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, serverTimestamp, getDoc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  ShieldCheck, 
  Coins, 
  UserCheck, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowRight,
  TrendingUp,
  Layout
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ApprovalsInbox = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState("finance");
  const [topups, setTopups] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [kycRequests, setKycRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Finance Queue (Coin Top-ups)
    const qFinance = query(collection(db, "coin_topups"), orderBy("created_at", "desc"));
    const unsubFinance = onSnapshot(qFinance, (snap) => {
      setTopups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 2. Trust & Safety Queue (Verifications)
    const qVerif = query(collection(db, "verification_requests"), orderBy("created_at", "desc"));
    const unsubVerif = onSnapshot(qVerif, (snap) => {
      setVerifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 3. KYC Queue (Virtual World)
    const qKyc = query(collection(db, "virtual_world_applications"), orderBy("created_at", "desc"));
    const unsubKyc = onSnapshot(qKyc, (snap) => {
      setKycRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    setLoading(false);
    return () => { unsubFinance(); unsubVerif(); unsubKyc(); };
  }, []);

  const handleApproveTopup = async (topup: any) => {
    try {
      await runTransaction(db, async (transaction) => {
        const topupRef = doc(db, "coin_topups", topup.id);
        const profileRef = doc(db, "profiles", topup.user_id);
        
        const profileSnap = await transaction.get(profileRef);
        if (!profileSnap.exists()) throw new Error("User profile not found");
        
        const currentBalance = profileSnap.data().coin_balance || 0;
        
        transaction.update(topupRef, {
          status: "approved",
          approved_at: serverTimestamp(),
          reviewer_id: user?.id
        });
        
        transaction.update(profileRef, {
          coin_balance: currentBalance + topup.coins,
          last_transaction_at: serverTimestamp()
        });

        // Add to ledger
        const ledgerRef = doc(collection(db, "ledger"));
        transaction.set(ledgerRef, {
          user_id: topup.user_id,
          type: "credit",
          amount: topup.coins,
          source: "topup",
          reference_id: topup.id,
          label: "Coin Purchase Approved",
          created_at: serverTimestamp()
        });
      });
      
      toast.success(`Approved ${topup.coins} coins for user`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleReject = async (collectionName: string, id: string) => {
    try {
      await updateDoc(doc(db, collectionName, id), {
        status: "rejected",
        reviewed_at: serverTimestamp(),
        reviewer_id: user?.id
      });
      toast.success("Request rejected");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleApproveKyc = async (req: any) => {
    try {
      await runTransaction(db, async (transaction) => {
        const reqRef = doc(db, "virtual_world_applications", req.id);
        const accessRef = doc(db, "virtual_world_access", req.user_id);
        
        transaction.update(reqRef, {
          status: "approved",
          approved_at: serverTimestamp(),
          reviewer_id: user?.id
        });
        
        transaction.set(accessRef, {
          user_id: req.user_id,
          is_active: true,
          daily_limit: 25,
          approved_at: serverTimestamp(),
          reviewer_id: user?.id
        });
      });
      
      toast.success(`Approved Virtual World access for ${req.full_name}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black">
      <TopBar title="Approvals Inbox" subtitle="Admin OS / Unified Queue" />
      
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 bg-zinc-900/50 p-1 rounded-2xl mb-6">
            <TabsTrigger value="finance" className="rounded-xl text-[11px] font-black uppercase tracking-widest">
              Finance ({topups.filter(t => t.status === 'submitted').length})
            </TabsTrigger>
            <TabsTrigger value="trust" className="rounded-xl text-[11px] font-black uppercase tracking-widest">
              Safety ({verifications.filter(v => v.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="kyc" className="rounded-xl text-[11px] font-black uppercase tracking-widest">
              KYC ({kycRequests.filter(k => k.status === 'pending').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="finance" className="mt-0 space-y-4">
            {topups.filter(t => t.status === 'submitted').map((topup) => (
              <div key={topup.id} className="p-5 rounded-3xl border border-white/[0.08] bg-zinc-900/20 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-orange-400/10 grid place-items-center">
                      <Coins className="h-5 w-5 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">₹{topup.amount_inr} for {topup.coins} Coins</p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        UTR: {topup.utr} · {topup.created_at?.seconds ? format(new Date(topup.created_at.seconds * 1000), 'MMM d, HH:mm') : 'Recently'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleReject("coin_topups", topup.id)}
                      className="h-8 w-8 rounded-full bg-rose-500/10 text-rose-500 grid place-items-center hover:bg-rose-500/20"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleApproveTopup(topup)}
                      className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-500 grid place-items-center hover:bg-emerald-500/20"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">ID: {topup.id}</div>
              </div>
            ))}
            {topups.filter(t => t.status === 'submitted').length === 0 && (
              <div className="py-20 text-center opacity-30 space-y-2">
                <TrendingUp className="h-10 w-10 mx-auto" />
                <p className="text-sm font-bold">Finance queue clear</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="trust" className="mt-0 space-y-4">
            {/* ... Verification items ... */}
            {verifications.filter(v => v.status === 'pending').map((req) => (
              <div key={req.id} className="p-5 rounded-3xl border border-white/[0.08] bg-zinc-900/20 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-blue-400/10 grid place-items-center">
                      <UserCheck className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">@{req.username}</p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        {req.kind} Verification
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleReject("verification_requests", req.id)} className="h-8 w-8 rounded-full bg-rose-500/10 text-rose-500 grid place-items-center"><XCircle className="h-4 w-4" /></button>
                    <button className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-500 grid place-items-center"><CheckCircle2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>
          
          <TabsContent value="kyc" className="mt-0 space-y-4">
            {kycRequests.filter(k => k.status === 'pending').map((req) => (
              <div key={req.id} className="p-5 rounded-3xl border border-white/[0.08] bg-zinc-900/20 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-indigo-400/10 grid place-items-center">
                      <ShieldCheck className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{req.full_name}</p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        KYC Request · {req.contact_phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleReject("virtual_world_applications", req.id)} className="h-8 w-8 rounded-full bg-rose-500/10 text-rose-500 grid place-items-center"><XCircle className="h-4 w-4" /></button>
                    <button onClick={() => handleApproveKyc(req)} className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-500 grid place-items-center"><CheckCircle2 className="h-4 w-4" /></button>
                  </div>
                </div>
                {req.purpose && <p className="text-[11px] text-zinc-400 italic">"{req.purpose}"</p>}
                <div className="grid grid-cols-3 gap-2">
                  {req.aadhaar_front_path && (
                    <div className="aspect-video rounded-lg bg-zinc-800 overflow-hidden border border-white/5">
                      <img src={req.aadhaar_front_path} alt="Front" className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                  {req.selfie_path && (
                    <div className="aspect-square rounded-lg bg-zinc-800 overflow-hidden border border-white/5">
                      <img src={req.selfie_path} alt="Selfie" className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {kycRequests.filter(k => k.status === 'pending').length === 0 && (
              <div className="py-20 text-center opacity-30 space-y-2">
                <ShieldCheck className="h-10 w-10 mx-auto" />
                <p className="text-sm font-bold">KYC queue clear</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ApprovalsInbox;
