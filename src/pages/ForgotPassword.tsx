import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { auth } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { toast } from "sonner";

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
              {sent ? "Check your email" : "Reset password"}
            </h1>
            <p className="text-sm text-zinc-400">
              {sent 
                ? `We've sent a link to ${email}`
                : "Enter your email to receive a reset link"
              }
            </p>
          </div>

          {!sent ? (
            <form onSubmit={handleReset} className="space-y-6">
              <div className="relative">
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full bg-[#121212] border border-white/10 rounded-md pl-4 pr-4 py-3 text-[14px] outline-none focus:border-white/20 transition-all placeholder:text-zinc-500"
                />
              </div>

              <button 
                type="submit"
                disabled={busy || !email}
                className="w-full bg-[#0095F6] hover:bg-[#1877F2] text-white font-semibold py-2 rounded-lg transition-all active:opacity-70 disabled:opacity-50 text-sm"
              >
                {busy ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          ) : (
            <button 
              onClick={() => setSent(false)}
              className="w-full bg-[#121212] border border-white/10 hover:bg-white/5 text-white font-semibold py-2 rounded-lg transition-all active:scale-[0.98] text-sm"
            >
              Try another email
            </button>
          )}
        </div>

        <div className="w-full mt-auto pt-6 border-t border-white/10">
          <p className="text-[14px] text-center text-white">
            Remembered?{" "}
            <Link to="/auth" className="text-[#0095F6] font-semibold hover:text-[#1877F2]">
              Log in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;