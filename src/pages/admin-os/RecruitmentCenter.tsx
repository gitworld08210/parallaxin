import { useEffect, useState } from "react";
import { TopBar } from "@/components/vibe/TopBar";
import { useAuth } from "@/contexts/AuthProvider";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Briefcase, UserPlus, Clock, AlertCircle, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const RecruitmentCenter = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "onboarding_sessions"), orderBy("created_at", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <div className="flex flex-col h-full bg-black">
      <TopBar title="Recruitment Center" subtitle="Admin OS / Talent Acquisition" />
      
      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-6 pt-2">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input 
              placeholder="Search candidates..."
              className="w-full bg-zinc-900/50 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-xs outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <button className="h-9 w-9 rounded-xl bg-zinc-900/50 border border-white/5 grid place-items-center">
            <Filter className="h-4 w-4 text-zinc-400" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link to="/admin-os/appointments" className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-bold">New Appointment</p>
              <p className="text-[10px] text-primary/70">Issue joining letter</p>
            </div>
          </Link>
          <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/[0.08] space-y-2 opacity-50">
            <Briefcase className="h-5 w-5 text-zinc-400" />
            <div>
              <p className="text-sm font-bold">Job Postings</p>
              <p className="text-[10px] text-zinc-500">Manage listings</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 px-1">Active Onboarding ({sessions.length})</h3>
          
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="p-4 rounded-3xl border border-white/[0.08] bg-zinc-900/20 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-zinc-800 grid place-items-center">
                      <Briefcase className="h-5 w-5 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{session.email}</p>
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                        {session.role} · {session.department}
                      </p>
                    </div>
                  </div>
                  <div className={cn(
                    "px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter",
                    session.status === 'pending_onboarding' ? "bg-orange-500/10 text-orange-500" : "bg-emerald-500/10 text-emerald-500"
                  )}>
                    {session.status.replace('_', ' ')}
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-medium">
                    <Clock className="h-3 w-3" />
                    Issued {session.created_at?.seconds ? format(new Date(session.created_at.seconds * 1000), 'MMM d') : 'Recently'}
                  </div>
                  <button className="text-[10px] font-bold text-primary hover:underline">View Letter</button>
                </div>
              </div>
            ))}

            {sessions.length === 0 && !loading && (
              <div className="py-20 text-center opacity-30 space-y-2">
                <AlertCircle className="h-10 w-10 mx-auto" />
                <p className="text-sm font-bold">No active recruitments</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecruitmentCenter;
