import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { auth } from "@/lib/firebase";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle } from "lucide-react";

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
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <AlertCircle className="h-16 w-16 text-rose-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-2">Invalid Link</h1>
          <p className="text-muted-foreground mb-8">This password reset link is invalid or has expired.</p>
          <Link to="/forgot-password" title="Request a new reset link" className="text-[#0095F6] font-bold hover:underline">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center sm:p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[400px] min-h-screen sm:min-h-0 sm:aspect-[9/19.5] relative z-10 bg-black sm:border sm:border-white/10 sm:rounded-[3rem] sm:shadow-2xl flex flex-col items-center pt-24 px-10 pb-10"
      >
        <div className="text-center mb-10 w-full">
          <div className="flex justify-center mb-10">
            <span className="text-5xl font-serif italic tracking-tighter">Parallax</span>
          </div>
        </div>

        <div className="w-full flex-1 space-y-6">
          <div className="text-center mb-2">
            <h1 className="text-xl font-bold mb-2">
              {success ? "Success!" : "New password"}
            </h1>
            <p className="text-sm text-zinc-400">
              {success 
                ? "Your password has been reset. Redirecting..."
                : "Choose a strong new password"
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
                <input 
                  type="password" 
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full bg-[#121212] border border-white/10 rounded-md pl-4 pr-4 py-3 text-[14px] outline-none focus:border-white/20 transition-all placeholder:text-zinc-500"
                />
              </div>

              <button 
                type="submit"
                disabled={busy || password.length < 6 || !validCode}
                className="w-full bg-[#0095F6] hover:bg-[#1877F2] text-white font-semibold py-2 rounded-lg transition-all active:opacity-70 disabled:opacity-50 text-sm"
              >
                {busy ? "Updating..." : "Reset Password"}
              </button>
            </form>
          )}
        </div>

        <div className="w-full mt-auto pt-6 border-t border-white/10">
          <p className="text-[14px] text-center text-white">
            <Link to="/auth" className="text-[#0095F6] font-semibold hover:text-[#1877F2]">
              Back to login
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;