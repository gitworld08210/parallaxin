import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, Check, X, Target, Settings2, Image as ImageIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OBJECTIVES, PLACEMENTS, CTAS, TARGETING, INTERESTS, LANGUAGES } from "@/features/ads/lib";

const STEPS = ["Objective", "Budget", "Audience", "Placement", "Creative"];

export default function CampaignWizard() {
  const { accountId } = useParams();
  const [step, setStep] = useState(0);

  return (
    <div className="mx-auto max-w-5xl animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white mb-2">Create New Campaign</h1>
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className={cn("flex items-center gap-2", i < STEPS.length - 1 && "flex-1")}>
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition",
                i <= step ? "bg-primary text-white" : "bg-white/5 text-muted-foreground"
              )}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn("text-xs font-bold uppercase tracking-widest", i <= step ? "text-white" : "text-muted-foreground")}>{s}</span>
              {i < STEPS.length - 1 && <div className="h-0.5 flex-1 bg-white/5 mx-2" />}
            </div>
          ))}
        </div>
      </div>

      <div className="min-h-[500px] rounded-3xl border border-white/5 bg-[#0f0f0f] p-8 shadow-2xl">
        {step === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {OBJECTIVES.map((obj) => (
              <button 
                key={obj.id}
                onClick={() => setStep(1)}
                className="group flex flex-col p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-primary/10 hover:border-primary/30 transition text-left"
              >
                <div className="mb-4 p-3 rounded-xl bg-white/5 w-fit group-hover:bg-primary group-hover:text-white transition">
                  <Target className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-white">{obj.label}</h3>
                <p className="text-sm text-muted-foreground mt-1">{obj.desc}</p>
              </button>
            ))}
          </div>
        )}

        {step > 0 && step < 4 && (
          <div className="flex h-full items-center justify-center py-20 text-muted-foreground">
             <div className="text-center">
               <Settings2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
               <p>Step {step + 1} configuration panel</p>
             </div>
          </div>
        )}

        {step === 4 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
             <div className="space-y-6">
               <div className="space-y-2">
                 <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ad Name</label>
                 <input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20" placeholder="e.g. Summer Collection Launch" />
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Primary Text</label>
                 <textarea className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white h-24" placeholder="Enter your ad copy here..." />
               </div>
             </div>
             
             <div className="bg-[#0a0a0a] rounded-2xl p-6 border border-white/5">
                <p className="text-sm font-bold text-muted-foreground mb-6">Preview</p>
                <div className="aspect-[9/16] w-full max-w-[280px] mx-auto rounded-3xl border-4 border-[#1f1f1f] bg-black overflow-hidden flex items-center justify-center">
                  <ImageIcon className="h-12 w-12 opacity-20" />
                </div>
             </div>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-8">
        <Button variant="ghost" className="text-muted-foreground" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Back</Button>
        <Button className="bg-primary hover:brightness-110" onClick={() => step < 4 ? setStep(step + 1) : null}>
          {step === 4 ? "Publish Campaign" : "Continue"}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}