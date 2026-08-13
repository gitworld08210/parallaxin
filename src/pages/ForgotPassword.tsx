import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { auth } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { toast } from "sonner";
import { ArrowLeft, Mail, Sparkles, ChevronRight } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
      toast.success("Reset link sent to your email");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to send reset email");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 blur-[120px] rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[440px] relative z-10"
      >
        <div className="text-center mb-10">
          <Link to="/auth" className="inline-flex items-center gap-2 text-muted-foreground hover:text-white transition-colors mb-8 group">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span className="text-sm font-medium">Back to login</span>
          </Link>

          <div className="flex justify-center mb-6">
            <div className="h-12 w-12 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {sent ? "Check your email" : "Reset password"}
          </h1>
          <p className="text-muted-foreground">
            {sent 
              ? `We've sent a password reset link to ${email}`
              : "Enter your email and we'll send you a link to reset your password"
            }
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleReset} className="space-y-6">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Mail className="h-5 w-5" />
              </div>
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full bg-[#111] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-[15px] outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            <button 
              type="submit"
              disabled={busy || !email}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-2xl shadow-glow transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy ? "Sending..." : "Send Reset Link"}
              {!busy && <ChevronRight className="h-5 w-5" />}
            </button>
          </form>
        ) : (
          <button 
            onClick={() => setSent(false)}
            className="w-full bg-[#111] border border-white/5 hover:bg-white/5 text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Try another email
          </button>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Remembered your password?{" "}
            <Link to="/auth" className="text-primary font-bold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
