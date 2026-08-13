import { 
  Film, 
  ImagePlus, 
  Radio, 
  X, 
  Music,
  Plus,
  Zap,
  Layout
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
};

export const UnifiedCreationSheet = ({ open, onClose }: Props) => {
  const nav = useNavigate();

  const options = [
    {
      id: "reel",
      label: "Reel",
      icon: Film,
      color: "bg-fuchsia-500",
      description: "Short vertical video",
      path: "/compose/reel"
    },
    {
      id: "post",
      label: "Post",
      icon: Layout,
      color: "bg-sky-500",
      description: "Photo or status",
      path: "/compose"
    },
    {
      id: "story",
      label: "Story",
      icon: ImagePlus,
      color: "bg-amber-500",
      description: "Disappears in 24h",
      path: "/compose/story"
    },
    {
      id: "live",
      label: "Go Live",
      icon: Radio,
      color: "bg-rose-500",
      description: "Stream to followers",
      path: "/live/host"
    }
  ];

  const handleSelect = (path: string) => {
    onClose();
    nav(path);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-[70] bg-[#111] border-t border-white/10 rounded-t-[2.5rem] px-6 pb-12 pt-8 max-w-[440px] mx-auto"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold tracking-tight">Create</h2>
              <button 
                onClick={onClose}
                className="h-9 w-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleSelect(opt.path)}
                  className="group relative flex flex-col items-start p-5 rounded-3xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all text-left overflow-hidden"
                >
                  <div className={cn(
                    "h-12 w-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
                    opt.color
                  )}>
                    <opt.icon className="h-6 w-6 text-white" />
                  </div>
                  <p className="font-bold text-lg leading-none mb-1">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                  
                  {/* Subtle accent glow */}
                  <div className={cn(
                    "absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity",
                    opt.color
                  )} />
                </button>
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <button 
                onClick={onClose}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-white transition-colors"
              >
                <Zap className="h-4 w-4" />
                Drafts & Scheduled
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
