import { useState, useEffect } from "react";
import { TopBar } from "@/components/vibe/TopBar";
import { useAuth } from "@/contexts/AuthProvider";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserPlus, Shield, Briefcase, FileText, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DEPARTMENTS = [
  "Founder Office", "Engineering", "Design", "Product", "Operations",
  "Finance", "HR", "Legal", "Marketing", "Sales", "Support", "Trust & Safety"
];

const ROLES = [
  "HR Head", "Finance Head", "COO", "CTO", "CEO", "Co-Founder", 
  "Lead Engineer", "Product Manager", "HR Executive", "Finance Executive"
];

const AppointmentsPanel = () => {
  const { user, profile } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [dept, setDept] = useState("");
  const [salary, setSalary] = useState("");
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<any[]>([]);

  // Only Founders, Co-Founders, and COO can appoint
  const canAppoint = profile?.is_founder || profile?.role === "COO" || profile?.role === "CEO" || profile?.role === "HR Head";

  const handleAppoint = async () => {
    if (!email || !role || !dept) {
      toast.error("Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      // 1. Create Onboarding Session in Firestore
      const sessionData = {
        email: email.trim(),
        role,
        department: dept,
        salary_offered: parseFloat(salary) || 0,
        appointed_by: user?.id,
        status: 'pending_onboarding',
        created_at: serverTimestamp(),
        joining_letter_url: null,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      };

      const docRef = await addDoc(collection(db, "onboarding_sessions"), sessionData);
      
      // 2. Mock calling the edge function for join letter generation
      // In a real app, this would trigger a Firebase Function or Supabase Edge Function
      toast.success(`Appointment invitation sent to ${email}`);
      
      setEmail("");
      setRole("");
      setDept("");
      setSalary("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!canAppoint) {
    return (
      <div className="flex flex-col h-full bg-background">
        <TopBar title="Unauthorized" />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 opacity-50">
          <Shield className="h-12 w-12 text-destructive" />
          <p className="text-sm font-medium">You do not have permission to access the Executive Appointment Panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background pb-20">
      <TopBar title="Executive Appointments" subtitle="Founder Office / Staffing" />
      
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        <div className="space-y-4">
          <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-2">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              Appoint New Executive
            </h3>
            <p className="text-[11px] text-muted-foreground">
              This will create a secure onboarding session and generate a joining letter.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Candidate Email</label>
              <div className="relative">
                <Shield className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
                <input 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@aurelix.com"
                  className="w-full bg-[#111] border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Role</label>
                <select 
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-sm outline-none appearance-none"
                >
                  <option value="">Select Role</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Department</label>
                <select 
                  value={dept}
                  onChange={e => setDept(e.target.value)}
                  className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-sm outline-none appearance-none"
                >
                  <option value="">Select Dept</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Annual CTC (Coins)</label>
              <div className="relative">
                <Briefcase className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
                <input 
                  type="number"
                  value={salary}
                  onChange={e => setSalary(e.target.value)}
                  placeholder="e.g. 1200000"
                  className="w-full bg-[#111] border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm outline-none"
                />
              </div>
            </div>

            <button 
              onClick={handleAppoint}
              disabled={loading}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? "Processing..." : "Issue Appointment"}
            </button>
          </div>
        </div>

        <div className="pt-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Recent Appointments</h3>
          <div className="space-y-2">
            {/* Placeholder for recent appointments */}
            <div className="p-3 rounded-xl border border-white/[0.05] bg-card/20 flex items-center justify-between opacity-50">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold">hr@aurelix.com</p>
                  <p className="text-[10px] text-muted-foreground">HR Head · Pending</p>
                </div>
              </div>
              <div className="h-6 w-6 rounded-full bg-zinc-800 grid place-items-center">
                <AlertCircle className="h-3 w-3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentsPanel;
