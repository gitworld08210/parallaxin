import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, Check, X, Target, Settings2, Image as ImageIcon, Sparkles, Wallet, Users, Layout, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadToCloudinary } from "@/lib/cloudinary";

import { cn } from "@/lib/utils";
import { OBJECTIVES, PLACEMENTS, CTAS, DEFAULT_TARGETING, INTERESTS, LANGUAGES, OPTIMIZATION_GOALS } from "@/features/ads/lib";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STEPS = ["Objective", "Budget", "Audience", "Placement", "Creative"];

export default function CampaignWizard() {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Form State
  const [objective, setObjective] = useState<string>("");
  const [budget, setBudget] = useState({ type: "daily", amount: 500 });
  const [targeting, setTargeting] = useState(DEFAULT_TARGETING);
  const [selectedPlacements, setSelectedPlacements] = useState<string[]>(["reels", "feed"]);
  const [adData, setAdData] = useState({
    name: "",
    headline: "",
    primaryText: "",
    cta: "learn_more",
    mediaPath: "",
    mediaType: "image" as "image" | "video"
  });


  const [dbInterests, setDbInterests] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    const fetchTaxonomy = async () => {
      // Use any to bypass TS error on new table while migration is pending
      const { data } = await (supabase as any).from('content_taxonomy').select('id, name').eq('level', 1);
      if (data) setDbInterests(data as any[]);
    };
    fetchTaxonomy();
  }, []);

  const handleNext = () => {
    if (step === 0 && !objective) {
      toast.error("Please select an objective");
      return;
    }
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handlePublish();
    }
  };

  const handlePublish = async () => {
    setLoading(true);
    try {
      // In a real flow, we'd create Campaign -> AdSet -> Ad
      // For now, simulate success
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success("Campaign published successfully!");
      navigate(`/ads/${accountId}`);
    } catch (error) {
      toast.error("Failed to publish campaign");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const url = await uploadToCloudinary(file);
      setAdData({ 
        ...adData, 
        mediaPath: url, 
        mediaType: file.type.startsWith("video") ? "video" : "image" 
      });
      toast.success("Media uploaded successfully");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="mx-auto max-w-5xl animate-in fade-in duration-500 pb-20">
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
              <span className={cn("text-xs font-bold uppercase tracking-widest hidden md:inline", i <= step ? "text-white" : "text-muted-foreground")}>{s}</span>
              {i < STEPS.length - 1 && <div className="h-0.5 flex-1 bg-white/5 mx-2" />}
            </div>
          ))}
        </div>
      </div>

      <div className="min-h-[500px] rounded-3xl border border-white/5 bg-[#0f0f0f] p-8 shadow-2xl">
        {step === 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Select Campaign Objective</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {OBJECTIVES.map((obj) => (
                <button 
                  key={obj.id}
                  onClick={() => {
                    setObjective(obj.id);
                    setStep(1);
                  }}
                  className={cn(
                    "group flex flex-col p-6 rounded-2xl border transition text-left",
                    objective === obj.id 
                      ? "bg-primary/20 border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]" 
                      : "border-white/5 bg-white/[0.02] hover:bg-primary/10 hover:border-primary/30"
                  )}
                >
                  <div className={cn(
                    "mb-4 p-3 rounded-xl transition w-fit",
                    objective === obj.id ? "bg-primary text-white" : "bg-white/5 group-hover:bg-primary group-hover:text-white"
                  )}>
                    <Target className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">{obj.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{obj.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-8 max-w-xl mx-auto">
            <h2 className="text-xl font-bold text-white">Set Your Budget</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Budget Type</label>
                <div className="flex gap-2">
                  {["daily", "lifetime"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setBudget({ ...budget, type: t })}
                      className={cn(
                        "flex-1 py-3 rounded-xl border text-sm font-bold capitalize transition",
                        budget.type === t ? "bg-primary border-primary text-white" : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Amount (Aurelix Coins)</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  <input 
                    type="number" 
                    value={budget.amount}
                    onChange={(e) => setBudget({ ...budget, amount: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-2xl font-black text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Suggested minimum: 200 AC / day</p>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Audience & Context</h2>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">AI Context Match</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Contextual Categories</label>
                  <p className="text-[10px] text-white/40 mb-3">Your ad will be matched to content in these categories.</p>
                  <div className="flex flex-wrap gap-2">
                    {(dbInterests.length > 0 ? dbInterests.map(i => i.name) : INTERESTS).map((interest) => (
                      <button
                        key={interest}
                        onClick={() => {
                          const next = targeting.interests.includes(interest)
                            ? targeting.interests.filter(i => i !== interest)
                            : [...targeting.interests, interest];
                          setTargeting({ ...targeting, interests: next });
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-bold border transition",
                          targeting.interests.includes(interest)
                            ? "bg-primary border-primary text-white"
                            : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                        )}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Brand Safety</label>
                  <div className="space-y-3">
                    {['Exclude Controversial Content', 'Exclude Political Content', 'Standard Inventory Only'].map((opt) => (
                      <div key={opt} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-sm text-white/80">{opt}</span>
                        <div className="h-5 w-9 rounded-full bg-primary/20 p-1 cursor-pointer">
                          <div className="h-3 w-3 rounded-full bg-primary ml-auto" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6 bg-white/[0.02] p-6 rounded-2xl border border-white/5 h-fit">
                <p className="text-sm font-bold text-white mb-4">Contextual Forecasting</p>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Daily Reach</span>
                      <span className="text-white font-bold">4.2k - 12.5k</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-2/3" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Context Match Efficiency</span>
                      <span className="text-white font-bold">High</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-[85%]" />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed pt-2">
                    Forecast based on versioned content taxonomy and recent user interest signals.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8">
            <h2 className="text-xl font-bold text-white">Placements</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PLACEMENTS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    const next = selectedPlacements.includes(p.id)
                      ? selectedPlacements.filter(id => id !== p.id)
                      : [...selectedPlacements, p.id];
                    setSelectedPlacements(next);
                  }}
                  className={cn(
                    "flex items-start gap-4 p-5 rounded-2xl border transition text-left",
                    selectedPlacements.includes(p.id)
                      ? "bg-primary/10 border-primary"
                      : "border-white/5 bg-white/[0.02] hover:bg-white/5"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-xl",
                    selectedPlacements.includes(p.id) ? "bg-primary text-white" : "bg-white/10 text-muted-foreground"
                  )}>
                    <Layout className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{p.label}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.hint}</p>
                    <span className="inline-block mt-2 text-[10px] font-black uppercase tracking-widest text-white/20">{p.ratio} Ratio</span>
                  </div>
                  <div className={cn(
                    "ml-auto h-5 w-5 rounded-full border-2 flex items-center justify-center transition",
                    selectedPlacements.includes(p.id) ? "bg-primary border-primary" : "border-white/10"
                  )}>
                    {selectedPlacements.includes(p.id) && <Check className="h-3 w-3 text-white" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
             <div className="space-y-6">
               <h2 className="text-xl font-bold text-white">Ad Creative</h2>
               <div className="space-y-4">
                 <div className="space-y-2">
                   <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ad Name</label>
                   <input 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:border-primary outline-none" 
                    placeholder="e.g. Summer Collection Launch" 
                    value={adData.name}
                    onChange={(e) => setAdData({...adData, name: e.target.value})}
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Headline</label>
                   <input 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:border-primary outline-none" 
                    placeholder="Short, catchy headline" 
                    value={adData.headline}
                    onChange={(e) => setAdData({...adData, headline: e.target.value})}
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Primary Text</label>
                   <textarea 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white h-24 focus:border-primary outline-none" 
                    placeholder="Enter your ad copy here..." 
                    value={adData.primaryText}
                    onChange={(e) => setAdData({...adData, primaryText: e.target.value})}
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Call to Action</label>
                   <select 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none appearance-none"
                    value={adData.cta}
                    onChange={(e) => setAdData({...adData, cta: e.target.value})}
                   >
                     {CTAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                   </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Media Asset</label>
                    <label className="flex flex-col items-center justify-center w-full h-32 bg-white/5 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition group">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {adData.mediaPath ? (
                          <p className="text-xs text-emerald-500 font-bold">Media Selected ✓</p>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 mb-2 text-white/40 group-hover:text-primary transition" />
                            <p className="text-[10px] text-white/40 uppercase font-bold">Upload Image or Video</p>
                          </>
                        )}
                      </div>
                      <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileUpload} disabled={loading} />
                    </label>
                  </div>
                </div>
              </div>

             
             <div className="bg-[#0a0a0a] rounded-3xl p-8 border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                  <span className="px-2 py-1 rounded bg-white/10 text-[10px] font-bold text-white/40 uppercase tracking-widest">Preview</span>
                </div>
                <div className="aspect-[9/16] w-full max-w-[260px] mx-auto rounded-[2rem] border-8 border-white/10 bg-black overflow-hidden flex flex-col relative shadow-2xl">
                  <div className="flex-1 flex items-center justify-center bg-zinc-900 overflow-hidden">
                    {adData.mediaPath ? (
                      adData.mediaType === "video" ? (
                        <video src={adData.mediaPath} className="w-full h-full object-cover" autoPlay muted loop />
                      ) : (
                        <img src={adData.mediaPath} className="w-full h-full object-cover" alt="Preview" />
                      )
                    ) : (
                      <ImageIcon className="h-12 w-12 text-white/10" />
                    )}
                  </div>

                  <div className="p-4 bg-gradient-to-t from-black to-transparent space-y-2">
                    <div className="h-2 w-2/3 bg-white/20 rounded" />
                    <div className="h-2 w-full bg-white/10 rounded" />
                    <div className="h-2 w-full bg-white/10 rounded" />
                    <div className="mt-4 py-2 bg-primary text-white text-[10px] font-bold text-center rounded-lg uppercase tracking-wider">
                      {CTAS.find(c => c.id === adData.cta)?.label || "Learn More"}
                    </div>
                  </div>
                </div>
             </div>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-8">
        <Button 
          variant="ghost" 
          className="text-muted-foreground hover:text-white" 
          onClick={() => setStep(Math.max(0, step - 1))} 
          disabled={step === 0 || loading}
        >
          Back
        </Button>
        <Button 
          className="bg-primary hover:brightness-110 px-8 h-12 rounded-xl text-white font-bold" 
          onClick={handleNext}
          disabled={loading}
        >
          {loading ? (
            <Sparkles className="h-5 w-5 animate-pulse" />
          ) : (
            <>
              {step === 4 ? "Launch Campaign" : "Continue"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}