import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { auth } from "@/lib/firebase";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { toast } from "sonner";
import { ChevronLeft, Lock, CheckCircle2, AlertCircle } from "lucide-react";

const ResetPassword = () => {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [validCode, setValidCode] = useState<boolean | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("oobCode");
    if (code) {
      setOobCode(code);
      verifyPasswordResetCode(auth, code)
        .then(() => setValidCode(true))
        .catch((err) => {
          console.error(err);
          setValidCode(false);
          toast.error("Invalid or expired reset link");
        });
    }
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode || password.length < 6) return;
    
    setBusy(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess(true);
      toast.success("Password updated successfully");
      setTimeout(() => nav("/auth"), 3000);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to update password");
    } finally {
      setBusy(false);
    }
  };

  if (oobCode && validCode === false) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <AlertCircle className="h-16 w-16 text-rose-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-2">Invalid Link</h1>
          <p className="text-muted-foreground mb-8">This password reset link is invalid or has expired.</p>
          <Link to="/forgot-password" title="Request a new reset link" className="text-primary font-bold hover:underline">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[440px] relative z-10"
      >
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <span className="text-5xl font-serif italic tracking-tighter">Parallax</span>
          </div>
          
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {success ? "Success!" : "New password"}
          </h1>
          <p className="text-muted-foreground">
            {success 
              ? "Your password has been reset. Redirecting to login..."
              : "Enter a strong new password for your account"
            }
          </p>
        </div>

        {success ? (
          <div className="flex justify-center py-8">
            <CheckCircle2 className="h-20 w-20 text-emerald-500 animate-in zoom-in duration-500" />
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-6">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Lock className="h-5 w-5" />
              </div>
              <input 
                type="password" 
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="New password"
                className="w-full bg-[#111] border border-white/5 rounded-lg pl-12 pr-4 py-4 text-[15px] outline-none focus:ring-1 focus:ring-primary/50 transition-all"
              />
            </div>

            <button 
              type="submit"
              disabled={busy || password.length < 6 || !validCode}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-lg transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? "Updating..." : "Reset Password"}
            </button>
          </form>
        )}

        {!success && (
          <div className="mt-8 text-center">
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-white transition-colors flex items-center justify-center gap-1">
              <ChevronLeft className="h-4 w-4" /> Back to login
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ResetPassword;
